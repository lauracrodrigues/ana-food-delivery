// Printer Layout Configuration Types

export type PaperWidth = "57mm" | "80mm";
export type FontSize = "normal" | "medium" | "large" | "xlarge";
export type LineSpacing = "compact" | "normal" | "relaxed";
export type PrintSector = "caixa" | "cozinha1" | "cozinha2" | "copa_bar";
export type TextAlign = "left" | "center" | "right";

export interface FontSizeConfig {
  header: FontSize;
  order_number: FontSize;
  item_name: FontSize;
  item_details: FontSize;
  totals: FontSize;
}

export interface TextFormatting {
  bold: boolean;
  underline: boolean;
  align: TextAlign;
}

export interface SectionFormatting {
  header: TextFormatting;
  order_number: TextFormatting;
  customer_info: TextFormatting;
  items: TextFormatting;
  item_details: TextFormatting;
  totals: TextFormatting;
  footer: TextFormatting;
}

export interface LayoutConfig {
  paper_width: PaperWidth;
  chars_per_line: number;
  allow_custom_chars_per_line: boolean;
  font_sizes: FontSizeConfig;
  formatting: SectionFormatting;
  show_company_logo: boolean;
  show_company_address: boolean;
  show_company_phone: boolean;
  show_order_source: boolean;
  show_customer_info: boolean;
  show_customer_address: boolean;
  show_item_observations: boolean;
  show_order_observations: boolean;
  show_payment_method: boolean;
  show_footer_message: boolean;
  footer_message: string;
  line_spacing: LineSpacing;
  cut_paper: boolean;
  extra_feed_lines: number;
}

export interface PrinterSettings {
  caixa?: string;
  cozinha1?: string;
  cozinha2?: string;
  copa_bar?: string;
  layout_configs?: {
    caixa?: LayoutConfig;
    cozinha1?: LayoutConfig;
    cozinha2?: LayoutConfig;
    copa_bar?: LayoutConfig;
  };
}

// Default configurations
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  paper_width: "80mm",
  chars_per_line: 48,
  allow_custom_chars_per_line: false,
  font_sizes: {
    header: "medium",
    order_number: "xlarge",
    item_name: "medium",
    item_details: "normal",
    totals: "large",
  },
  formatting: {
    header: { bold: true, underline: false, align: "center" },
    order_number: { bold: true, underline: false, align: "center" },
    customer_info: { bold: false, underline: false, align: "left" },
    items: { bold: true, underline: false, align: "left" },
    item_details: { bold: false, underline: false, align: "left" },
    totals: { bold: true, underline: false, align: "left" },
    footer: { bold: false, underline: false, align: "center" },
  },
  show_company_logo: true,
  show_company_address: true,
  show_company_phone: true,
  show_order_source: true,
  show_customer_info: true,
  show_customer_address: true,
  show_item_observations: true,
  show_order_observations: true,
  show_payment_method: true,
  show_footer_message: true,
  footer_message: "Obrigado pela preferência!",
  line_spacing: "normal",
  cut_paper: true,
  extra_feed_lines: 4,
};

// Paper width to characters mapping
export const PAPER_WIDTHS: Record<PaperWidth, number> = {
  "57mm": 32,
  "80mm": 48,
};

// ESC/POS font size commands
export const FONT_SIZE_COMMANDS: Record<FontSize, string> = {
  normal: "\x1B!\x00",
  medium: "\x1D!\x01",
  large: "\x1D!\x11",
  xlarge: "\x1D!\x22",
};

// ESC/POS text formatting commands
export const TEXT_FORMATTING_COMMANDS = {
  bold: {
    on: "\x1B\x45\x01",
    off: "\x1B\x45\x00",
  },
  underline: {
    on: "\x1B\x2D\x01",
    off: "\x1B\x2D\x00",
  },
  align: {
    left: "\x1B\x61\x00",
    center: "\x1B\x61\x01",
    right: "\x1B\x61\x02",
  },
};

// Line spacing values
export const LINE_SPACING_VALUES: Record<LineSpacing, number> = {
  compact: 1,
  normal: 2,
  relaxed: 3,
};
