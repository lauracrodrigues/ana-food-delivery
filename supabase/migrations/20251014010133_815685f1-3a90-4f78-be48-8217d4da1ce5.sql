-- Migration: Update printer_settings structure to support extended layout configuration

-- Add extended layout configuration to existing printer_settings
-- This updates the JSONB structure to include the new fields for drag-and-drop configuration

-- Update existing records to include the new extended layout structure
UPDATE store_settings
SET printer_settings = jsonb_set(
  COALESCE(printer_settings, '{}'::jsonb),
  '{layout_configs}',
  jsonb_build_object(
    'caixa', jsonb_build_object(
      'paper_width', '80mm',
      'chars_per_line', 48,
      'allow_custom_chars_per_line', false,
      'header', jsonb_build_object(
        'elements', jsonb_build_array(
          jsonb_build_object(
            'id', 'h1',
            'tag', '{nome_empresa}',
            'label', 'Nome da Empresa',
            'visible', true,
            'formatting', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
            'fontSize', 'large',
            'order', 1
          ),
          jsonb_build_object(
            'id', 'h2',
            'tag', '{telefone}',
            'label', 'Telefone',
            'visible', true,
            'formatting', jsonb_build_object('bold', false, 'underline', false, 'align', 'center'),
            'fontSize', 'medium',
            'order', 2
          )
        ),
        'separator', jsonb_build_object('show', true, 'type', 'equals', 'char', '=')
      ),
      'body', jsonb_build_object(
        'elements', jsonb_build_array(
          jsonb_build_object(
            'id', 'b1',
            'tag', '{numero_pedido}',
            'label', 'Número do Pedido',
            'visible', true,
            'formatting', jsonb_build_object('bold', true, 'underline', false, 'align', 'left'),
            'fontSize', 'large',
            'order', 1
          ),
          jsonb_build_object(
            'id', 'b2',
            'tag', '{nome_cliente}',
            'label', 'Nome do Cliente',
            'visible', true,
            'formatting', jsonb_build_object('bold', true, 'underline', false, 'align', 'left'),
            'fontSize', 'medium',
            'order', 2
          ),
          jsonb_build_object(
            'id', 'b3',
            'tag', '{telefone_cliente}',
            'label', 'Telefone do Cliente',
            'visible', true,
            'formatting', jsonb_build_object('bold', false, 'underline', false, 'align', 'left'),
            'fontSize', 'small',
            'order', 3
          )
        ),
        'separator', jsonb_build_object('show', true, 'type', 'line', 'char', '-')
      ),
      'footer', jsonb_build_object(
        'elements', jsonb_build_array(
          jsonb_build_object(
            'id', 'f1',
            'tag', '{mensagem_rodape}',
            'label', 'Mensagem de Rodapé',
            'visible', true,
            'formatting', jsonb_build_object('bold', false, 'underline', false, 'align', 'center'),
            'fontSize', 'medium',
            'order', 1
          )
        ),
        'separator', jsonb_build_object('show', true, 'type', 'line', 'char', '-')
      ),
      'item_quantity_format', '2x',
      'item_price_position', 'next_line',
      'show_item_extras', true,
      'item_extras_prefix', '+ ',
      'show_item_observations', true,
      'item_observations_prefix', 'Obs: ',
      'show_subtotal', true,
      'show_delivery_fee', true,
      'show_payment_method', true,
      'footer_message', 'Obrigado pela preferência!',
      'extra_feed_lines', 3,
      'auto_cut', true,
      'encoding', 'UTF-8',
      'margin_left', 0,
      'margin_right', 0,
      'line_spacing', 'normal'
    ),
    'cozinha_1', jsonb_build_object(
      'paper_width', '80mm',
      'chars_per_line', 48,
      'allow_custom_chars_per_line', false,
      'header', jsonb_build_object(
        'elements', jsonb_build_array(
          jsonb_build_object(
            'id', 'h1',
            'tag', '{numero_pedido}',
            'label', 'Número do Pedido',
            'visible', true,
            'formatting', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
            'fontSize', 'xlarge',
            'order', 1
          )
        ),
        'separator', jsonb_build_object('show', true, 'type', 'equals', 'char', '=')
      ),
      'body', jsonb_build_object(
        'elements', jsonb_build_array(),
        'separator', jsonb_build_object('show', true, 'type', 'line', 'char', '-')
      ),
      'footer', jsonb_build_object(
        'elements', jsonb_build_array(),
        'separator', jsonb_build_object('show', false, 'type', 'line', 'char', '-')
      ),
      'item_quantity_format', '2x',
      'item_price_position', 'next_line',
      'show_item_extras', true,
      'item_extras_prefix', '+ ',
      'show_item_observations', true,
      'item_observations_prefix', 'Obs: ',
      'show_subtotal', false,
      'show_delivery_fee', false,
      'show_payment_method', false,
      'footer_message', '',
      'extra_feed_lines', 5,
      'auto_cut', true,
      'encoding', 'UTF-8',
      'margin_left', 0,
      'margin_right', 0,
      'line_spacing', 'normal'
    ),
    'cozinha_2', jsonb_build_object(
      'paper_width', '80mm',
      'chars_per_line', 48,
      'allow_custom_chars_per_line', false,
      'header', jsonb_build_object(
        'elements', jsonb_build_array(
          jsonb_build_object(
            'id', 'h1',
            'tag', '{numero_pedido}',
            'label', 'Número do Pedido',
            'visible', true,
            'formatting', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
            'fontSize', 'xlarge',
            'order', 1
          )
        ),
        'separator', jsonb_build_object('show', true, 'type', 'equals', 'char', '=')
      ),
      'body', jsonb_build_object(
        'elements', jsonb_build_array(),
        'separator', jsonb_build_object('show', true, 'type', 'line', 'char', '-')
      ),
      'footer', jsonb_build_object(
        'elements', jsonb_build_array(),
        'separator', jsonb_build_object('show', false, 'type', 'line', 'char', '-')
      ),
      'item_quantity_format', '2x',
      'item_price_position', 'next_line',
      'show_item_extras', true,
      'item_extras_prefix', '+ ',
      'show_item_observations', true,
      'item_observations_prefix', 'Obs: ',
      'show_subtotal', false,
      'show_delivery_fee', false,
      'show_payment_method', false,
      'footer_message', '',
      'extra_feed_lines', 5,
      'auto_cut', true,
      'encoding', 'UTF-8',
      'margin_left', 0,
      'margin_right', 0,
      'line_spacing', 'normal'
    ),
    'copa_bar', jsonb_build_object(
      'paper_width', '80mm',
      'chars_per_line', 48,
      'allow_custom_chars_per_line', false,
      'header', jsonb_build_object(
        'elements', jsonb_build_array(
          jsonb_build_object(
            'id', 'h1',
            'tag', '{numero_pedido}',
            'label', 'Número do Pedido',
            'visible', true,
            'formatting', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
            'fontSize', 'xlarge',
            'order', 1
          )
        ),
        'separator', jsonb_build_object('show', true, 'type', 'equals', 'char', '=')
      ),
      'body', jsonb_build_object(
        'elements', jsonb_build_array(),
        'separator', jsonb_build_object('show', true, 'type', 'line', 'char', '-')
      ),
      'footer', jsonb_build_object(
        'elements', jsonb_build_array(),
        'separator', jsonb_build_object('show', false, 'type', 'line', 'char', '-')
      ),
      'item_quantity_format', '2x',
      'item_price_position', 'next_line',
      'show_item_extras', true,
      'item_extras_prefix', '+ ',
      'show_item_observations', true,
      'item_observations_prefix', 'Obs: ',
      'show_subtotal', false,
      'show_delivery_fee', false,
      'show_payment_method', false,
      'footer_message', '',
      'extra_feed_lines', 5,
      'auto_cut', true,
      'encoding', 'UTF-8',
      'margin_left', 0,
      'margin_right', 0,
      'line_spacing', 'normal'
    )
  )
)
WHERE printer_settings IS NOT NULL OR printer_settings IS NULL;