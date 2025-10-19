import type { UnifiedPrintElement, ExtendedLayoutConfig, TextAlign } from '@/types/printer-layout-extended';

/**
 * Motor compartilhado de renderização térmica
 * Garante que preview e impressão real usem a mesma lógica
 */
export class ThermalRenderer {
  /**
   * Renderiza uma linha de texto com alinhamento
   */
  static renderLine(
    text: string,
    align: TextAlign,
    maxWidth: number,
    applyPadding = true
  ): string {
    const cleanText = text.trim();
    
    if (!applyPadding) return cleanText;
    
    switch (align) {
      case 'center': {
        const leftPad = Math.floor((maxWidth - cleanText.length) / 2);
        return ' '.repeat(Math.max(0, leftPad)) + cleanText;
      }
      case 'right': {
        const padding = maxWidth - cleanText.length;
        return ' '.repeat(Math.max(0, padding)) + cleanText;
      }
      default:
        return cleanText;
    }
  }

  /**
   * Quebra texto em múltiplas linhas respeitando largura máxima
   */
  static wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Palavra maior que a largura - força quebra
          lines.push(word);
        }
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  /**
   * Renderiza um elemento completo (multi-linha se necessário)
   */
  static renderElement(
    element: UnifiedPrintElement,
    content: string,
    config: ExtendedLayoutConfig
  ): string[] {
    const effectiveWidth = config.chars_per_line - (config.margin_left || 0) - (config.margin_right || 0);
    const wrappedLines = this.wrapText(content, effectiveWidth);
    
    return wrappedLines.map(line => 
      this.renderLine(line, element.formatting.align, effectiveWidth, true)
    );
  }

  /**
   * Renderiza um separador
   */
  static renderSeparator(char: string, width: number): string {
    return char.repeat(width);
  }

  /**
   * Calcula largura efetiva considerando margens
   */
  static getEffectiveWidth(config: ExtendedLayoutConfig): number {
    return config.chars_per_line - (config.margin_left || 0) - (config.margin_right || 0);
  }

  /**
   * Renderiza uma linha de item com quantidade, nome e preço
   */
  static renderItemLine(
    qty: number,
    name: string,
    price: string,
    maxWidth: number
  ): string {
    const qtyStr = `${qty}x`;
    const remaining = maxWidth - qtyStr.length - price.length - 2; // -2 para espaços
    
    let itemName = name;
    if (itemName.length > remaining) {
      itemName = itemName.substring(0, remaining - 3) + '...';
    }
    
    const spaces = maxWidth - qtyStr.length - itemName.length - price.length;
    
    return `${qtyStr} ${itemName}${' '.repeat(Math.max(1, spaces))}${price}`;
  }

  /**
   * Aplica formatação de texto (negrito, sublinhado)
   */
  static applyFormatting(
    text: string,
    bold: boolean,
    underline: boolean
  ): string {
    // Para HTML/Preview
    let result = text;
    if (bold) result = `<strong>${result}</strong>`;
    if (underline) result = `<u>${result}</u>`;
    return result;
  }

  /**
   * Limpa caracteres especiais para impressão térmica
   * MANTÉM acentos, apenas remove emojis
   */
  static sanitizeForThermal(text: string): string {
    // Apenas remove emojis, MANTÉM acentos para suportar português
    return text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Remove símbolos diversos
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Remove dingbats
      .trim();
  }
}
