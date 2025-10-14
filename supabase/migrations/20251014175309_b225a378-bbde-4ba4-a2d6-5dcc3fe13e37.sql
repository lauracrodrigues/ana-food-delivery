-- Migração: Estrutura unificada de configurações de impressão por setor
-- Converte a estrutura antiga (printer_settings com impressoras dispersas)
-- para a nova estrutura (printer_settings.sectors com configurações completas)

DO $$
DECLARE
  settings_record RECORD;
  old_settings JSONB;
  new_settings JSONB;
  caixa_printer TEXT;
  cozinha1_printer TEXT;
  cozinha2_printer TEXT;
  copa_bar_printer TEXT;
  auto_print_value BOOLEAN;
  layout_configs JSONB;
BEGIN
  -- Iterar sobre cada registro em store_settings
  FOR settings_record IN 
    SELECT id, company_id, printer_settings 
    FROM store_settings 
    WHERE printer_settings IS NOT NULL
  LOOP
    old_settings := settings_record.printer_settings;
    
    -- Se já tem a estrutura nova, pular
    IF old_settings ? 'sectors' THEN
      CONTINUE;
    END IF;
    
    -- Extrair valores da estrutura antiga
    caixa_printer := COALESCE(
      old_settings->>'caixa',
      old_settings->'printers'->>'caixa',
      ''
    );
    
    cozinha1_printer := COALESCE(
      old_settings->>'cozinha1',
      old_settings->'printers'->>'cozinha_1',
      ''
    );
    
    cozinha2_printer := COALESCE(
      old_settings->>'cozinha2',
      old_settings->'printers'->>'cozinha_2',
      ''
    );
    
    copa_bar_printer := COALESCE(
      old_settings->>'copa_bar',
      old_settings->'printers'->>'copa_bar',
      ''
    );
    
    auto_print_value := COALESCE(
      (old_settings->>'auto_print')::BOOLEAN,
      true
    );
    
    layout_configs := COALESCE(
      old_settings->'layout_configs',
      '{}'::JSONB
    );
    
    -- Construir nova estrutura
    new_settings := jsonb_build_object(
      'auto_print', auto_print_value,
      'sectors', jsonb_build_object(
        'caixa', jsonb_build_object(
          'enabled', true,
          'printer_name', caixa_printer,
          'copies', 1,
          'layout', COALESCE(layout_configs->'caixa', '{}'::JSONB)
        ),
        'cozinha_1', jsonb_build_object(
          'enabled', CASE WHEN cozinha1_printer != '' THEN true ELSE false END,
          'printer_name', cozinha1_printer,
          'copies', 1,
          'layout', COALESCE(layout_configs->'cozinha_1', '{}'::JSONB)
        ),
        'cozinha_2', jsonb_build_object(
          'enabled', CASE WHEN cozinha2_printer != '' THEN true ELSE false END,
          'printer_name', cozinha2_printer,
          'copies', 1,
          'layout', COALESCE(layout_configs->'cozinha_2', '{}'::JSONB)
        ),
        'copa_bar', jsonb_build_object(
          'enabled', CASE WHEN copa_bar_printer != '' THEN true ELSE false END,
          'printer_name', copa_bar_printer,
          'copies', 1,
          'layout', COALESCE(layout_configs->'copa_bar', '{}'::JSONB)
        )
      )
    );
    
    -- Atualizar registro com nova estrutura
    UPDATE store_settings
    SET printer_settings = new_settings
    WHERE id = settings_record.id;
    
    RAISE NOTICE 'Migrado: company_id=%, caixa=%, cozinha1=%, cozinha2=%, copa_bar=%',
      settings_record.company_id,
      caixa_printer,
      cozinha1_printer,
      cozinha2_printer,
      copa_bar_printer;
  END LOOP;
  
  RAISE NOTICE 'Migração concluída com sucesso!';
END $$;
