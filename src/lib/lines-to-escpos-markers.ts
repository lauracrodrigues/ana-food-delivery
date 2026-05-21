// v1.0.1 — Converte FormattedLine[] (do preview) → string com marcadores ESC/POS
// Agente desktop interpreta {{C}}, {{L}}, {{2X}}, {{B}}, {{QR:data}}.
// Garante que IMPRESSÃO === PREVIEW.
import type { FormattedLine } from "@/types/printer-layout-extended";

export function linesToEscPosMarkers(lines: FormattedLine[]): string {
  const out: string[] = [];
  let lastAlign: string | undefined;
  let lastSize: string | undefined;

  for (const line of lines) {
    const f = line.formatting || {};
    const prefix: string[] = [];

    // Alignment
    const align = f.align || 'left';
    if (align !== lastAlign) {
      if (align === 'center') prefix.push('{{C}}');
      else if (align === 'right') prefix.push('{{R}}');
      else prefix.push('{{L}}');
      lastAlign = align;
    }

    // Size: xlarge/large → 2X. small/medium → normal.
    const size = f.fontSize === 'xlarge' || f.fontSize === 'large' ? 'big' : 'normal';
    if (size !== lastSize) {
      prefix.push(size === 'big' ? '{{2X}}' : '{{N}}');
      lastSize = size;
    }

    // Bold inline (não permanente — wrap só essa linha)
    const text = line.text ?? '';
    if (f.bold) {
      out.push(prefix.join('') + '{{B}}' + text + '{{/B}}');
    } else {
      out.push(prefix.join('') + text);
    }
  }

  // Reset no final
  out.push('{{L}}{{N}}');
  return out.join('\n');
}
