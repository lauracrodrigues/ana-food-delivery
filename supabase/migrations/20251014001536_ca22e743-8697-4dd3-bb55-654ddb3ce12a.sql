-- Add layout_configs to printer_settings for all existing records
UPDATE store_settings
SET printer_settings = jsonb_set(
  COALESCE(printer_settings, '{}'::jsonb),
  '{layout_configs}',
  '{
    "caixa": {
      "paper_width": "80mm",
      "chars_per_line": 48,
      "font_sizes": {
        "header": "medium",
        "order_number": "xlarge",
        "item_name": "medium",
        "item_details": "normal",
        "totals": "large"
      },
      "show_company_logo": true,
      "show_company_address": true,
      "show_company_phone": true,
      "show_order_source": true,
      "show_customer_info": true,
      "show_customer_address": true,
      "show_item_observations": true,
      "show_order_observations": true,
      "show_payment_method": true,
      "show_footer_message": true,
      "footer_message": "Obrigado pela preferência!",
      "line_spacing": "normal",
      "cut_paper": true,
      "extra_feed_lines": 4
    },
    "cozinha1": {
      "paper_width": "80mm",
      "chars_per_line": 48,
      "font_sizes": {
        "header": "medium",
        "order_number": "xlarge",
        "item_name": "large",
        "item_details": "normal",
        "totals": "normal"
      },
      "show_company_logo": false,
      "show_company_address": false,
      "show_company_phone": false,
      "show_order_source": true,
      "show_customer_info": true,
      "show_customer_address": false,
      "show_item_observations": true,
      "show_order_observations": true,
      "show_payment_method": false,
      "show_footer_message": false,
      "footer_message": "",
      "line_spacing": "normal",
      "cut_paper": true,
      "extra_feed_lines": 4
    },
    "cozinha2": {
      "paper_width": "80mm",
      "chars_per_line": 48,
      "font_sizes": {
        "header": "medium",
        "order_number": "xlarge",
        "item_name": "large",
        "item_details": "normal",
        "totals": "normal"
      },
      "show_company_logo": false,
      "show_company_address": false,
      "show_company_phone": false,
      "show_order_source": true,
      "show_customer_info": true,
      "show_customer_address": false,
      "show_item_observations": true,
      "show_order_observations": true,
      "show_payment_method": false,
      "show_footer_message": false,
      "footer_message": "",
      "line_spacing": "normal",
      "cut_paper": true,
      "extra_feed_lines": 4
    },
    "copa_bar": {
      "paper_width": "80mm",
      "chars_per_line": 48,
      "font_sizes": {
        "header": "medium",
        "order_number": "xlarge",
        "item_name": "large",
        "item_details": "normal",
        "totals": "normal"
      },
      "show_company_logo": false,
      "show_company_address": false,
      "show_company_phone": false,
      "show_order_source": true,
      "show_customer_info": true,
      "show_customer_address": false,
      "show_item_observations": true,
      "show_order_observations": true,
      "show_payment_method": false,
      "show_footer_message": false,
      "footer_message": "",
      "line_spacing": "normal",
      "cut_paper": true,
      "extra_feed_lines": 4
    }
  }'::jsonb
)
WHERE NOT (printer_settings ? 'layout_configs');