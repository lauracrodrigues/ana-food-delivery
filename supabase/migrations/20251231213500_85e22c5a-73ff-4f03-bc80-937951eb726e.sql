-- 1. Criar coluna addresses (JSONB array)
ALTER TABLE customers 
ADD COLUMN addresses jsonb DEFAULT '[]'::jsonb;

-- 2. Migrar dados existentes dos 7 campos para o array
UPDATE customers 
SET addresses = CASE 
  WHEN address IS NOT NULL OR neighborhood IS NOT NULL THEN
    jsonb_build_array(
      jsonb_build_object(
        'label', 'Principal',
        'is_default', true,
        'address', COALESCE(address, ''),
        'address_number', COALESCE(address_number, ''),
        'address_complement', COALESCE(address_complement, ''),
        'neighborhood', COALESCE(neighborhood, ''),
        'city', COALESCE(city, ''),
        'state', COALESCE(state, ''),
        'zip_code', COALESCE(zip_code, '')
      )
    )
  ELSE '[]'::jsonb
END;

-- 3. Remover colunas antigas de endereço
ALTER TABLE customers 
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS address_number,
  DROP COLUMN IF EXISTS address_complement,
  DROP COLUMN IF EXISTS neighborhood,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS zip_code;

-- 4. Documentação da estrutura
COMMENT ON COLUMN customers.addresses IS 
'Array de endereços do cliente. Estrutura: [{label, is_default, address, address_number, address_complement, neighborhood, city, state, zip_code}]';