-- Update existing printer_settings to include new formatting fields
UPDATE store_settings
SET printer_settings = jsonb_set(
  COALESCE(printer_settings, '{}'::jsonb),
  '{layout_configs}',
  jsonb_build_object(
    'caixa', jsonb_build_object(
      'paper_width', '80mm',
      'chars_per_line', 48,
      'allow_custom_chars_per_line', false,
      'font_sizes', jsonb_build_object(
        'header', 'medium',
        'order_number', 'xlarge',
        'item_name', 'medium',
        'item_details', 'normal',
        'totals', 'large'
      ),
      'formatting', jsonb_build_object(
        'header', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
        'order_number', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
        'customer_info', jsonb_build_object('bold', false, 'underline', false, 'align', 'left'),
        'items', jsonb_build_object('bold', true, 'underline', false, 'align', 'left'),
        'item_details', jsonb_build_object('bold', false, 'underline', false, 'align', 'left'),
        'totals', jsonb_build_object('bold', true, 'underline', false, 'align', 'left'),
        'footer', jsonb_build_object('bold', false, 'underline', false, 'align', 'center')
      ),
      'show_company_logo', true,
      'show_company_address', true,
      'show_company_phone', true,
      'show_order_source', true,
      'show_customer_info', true,
      'show_customer_address', true,
      'show_item_observations', true,
      'show_order_observations', true,
      'show_payment_method', true,
      'show_footer_message', true,
      'footer_message', 'Obrigado pela preferência!',
      'line_spacing', 'normal',
      'cut_paper', true,
      'extra_feed_lines', 4
    ),
    'cozinha1', jsonb_build_object(
      'paper_width', '80mm',
      'chars_per_line', 48,
      'allow_custom_chars_per_line', false,
      'font_sizes', jsonb_build_object(
        'header', 'medium',
        'order_number', 'xlarge',
        'item_name', 'medium',
        'item_details', 'normal',
        'totals', 'large'
      ),
      'formatting', jsonb_build_object(
        'header', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
        'order_number', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
        'customer_info', jsonb_build_object('bold', false, 'underline', false, 'align', 'left'),
        'items', jsonb_build_object('bold', true, 'underline', false, 'align', 'left'),
        'item_details', jsonb_build_object('bold', false, 'underline', false, 'align', 'left'),
        'totals', jsonb_build_object('bold', true, 'underline', false, 'align', 'left'),
        'footer', jsonb_build_object('bold', false, 'underline', false, 'align', 'center')
      ),
      'show_company_logo', false,
      'show_company_address', false,
      'show_company_phone', false,
      'show_order_source', true,
      'show_customer_info', true,
      'show_customer_address', false,
      'show_item_observations', true,
      'show_order_observations', true,
      'show_payment_method', false,
      'show_footer_message', false,
      'footer_message', '',
      'line_spacing', 'normal',
      'cut_paper', true,
      'extra_feed_lines', 4
    ),
    'cozinha2', jsonb_build_object(
      'paper_width', '80mm',
      'chars_per_line', 48,
      'allow_custom_chars_per_line', false,
      'font_sizes', jsonb_build_object(
        'header', 'medium',
        'order_number', 'xlarge',
        'item_name', 'medium',
        'item_details', 'normal',
        'totals', 'large'
      ),
      'formatting', jsonb_build_object(
        'header', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
        'order_number', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
        'customer_info', jsonb_build_object('bold', false, 'underline', false, 'align', 'left'),
        'items', jsonb_build_object('bold', true, 'underline', false, 'align', 'left'),
        'item_details', jsonb_build_object('bold', false, 'underline', false, 'align', 'left'),
        'totals', jsonb_build_object('bold', true, 'underline', false, 'align', 'left'),
        'footer', jsonb_build_object('bold', false, 'underline', false, 'align', 'center')
      ),
      'show_company_logo', false,
      'show_company_address', false,
      'show_company_phone', false,
      'show_order_source', true,
      'show_customer_info', true,
      'show_customer_address', false,
      'show_item_observations', true,
      'show_order_observations', true,
      'show_payment_method', false,
      'show_footer_message', false,
      'footer_message', '',
      'line_spacing', 'normal',
      'cut_paper', true,
      'extra_feed_lines', 4
    ),
    'copa_bar', jsonb_build_object(
      'paper_width', '80mm',
      'chars_per_line', 48,
      'allow_custom_chars_per_line', false,
      'font_sizes', jsonb_build_object(
        'header', 'medium',
        'order_number', 'xlarge',
        'item_name', 'medium',
        'item_details', 'normal',
        'totals', 'large'
      ),
      'formatting', jsonb_build_object(
        'header', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
        'order_number', jsonb_build_object('bold', true, 'underline', false, 'align', 'center'),
        'customer_info', jsonb_build_object('bold', false, 'underline', false, 'align', 'left'),
        'items', jsonb_build_object('bold', true, 'underline', false, 'align', 'left'),
        'item_details', jsonb_build_object('bold', false, 'underline', false, 'align', 'left'),
        'totals', jsonb_build_object('bold', true, 'underline', false, 'align', 'left'),
        'footer', jsonb_build_object('bold', false, 'underline', false, 'align', 'center')
      ),
      'show_company_logo', false,
      'show_company_address', false,
      'show_company_phone', false,
      'show_order_source', true,
      'show_customer_info', true,
      'show_customer_address', false,
      'show_item_observations', true,
      'show_order_observations', true,
      'show_payment_method', false,
      'show_footer_message', false,
      'footer_message', '',
      'line_spacing', 'normal',
      'cut_paper', true,
      'extra_feed_lines', 4
    )
  )
)
WHERE NOT (printer_settings ? 'layout_configs')
  OR NOT (printer_settings->'layout_configs'->'caixa' ? 'formatting');