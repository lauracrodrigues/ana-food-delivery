-- v1.0.0 — Validação de subdomain no banco (defesa em profundidade)
-- Bloqueia subdomínios reservados + formato inválido em INSERT/UPDATE.

CREATE OR REPLACE FUNCTION validate_company_subdomain()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  reserved text[] := ARRAY[
    'www','api','evo','admin','app','mail','blog',
    'gestao','login','auth','dashboard','panel','support',
    'help','docs','status','cdn','static','assets',
    'menu','menus','orders','pedidos','checkout','cart',
    'webhook','webhooks','billing','pay','pagamento'
  ];
  sub text;
BEGIN
  IF NEW.subdomain IS NULL OR length(trim(NEW.subdomain)) = 0 THEN
    RETURN NEW;
  END IF;

  sub := lower(trim(NEW.subdomain));
  NEW.subdomain := sub; -- normaliza pra lowercase

  -- Regex: começa/termina alfanumérico, permite hífen meio, 3-30 chars
  IF NOT (sub ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$') THEN
    RAISE EXCEPTION 'Subdomínio inválido: "%". Use só letras minúsculas, números e hífen (não no início/fim, 3-30 chars).', sub;
  END IF;

  -- Reservados
  IF sub = ANY(reserved) THEN
    RAISE EXCEPTION 'Subdomínio "%" é reservado pelo sistema. Escolha outro.', sub;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_subdomain ON companies;
CREATE TRIGGER trg_validate_subdomain
  BEFORE INSERT OR UPDATE OF subdomain ON companies
  FOR EACH ROW
  EXECUTE FUNCTION validate_company_subdomain();

COMMENT ON FUNCTION validate_company_subdomain IS
  'Defesa em profundidade: valida formato + bloqueia subdomínios reservados de infra.';
