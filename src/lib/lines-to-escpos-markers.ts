// v1.2.0 — Converte FormattedLine[] (do preview) → string com marcadores ESC/POS
// Agente desktop interpreta: {{C}}, {{L}}, {{R}}, {{COND}}, {{N}}, {{2H}}, {{2X}}, {{B}}, {{/B}},
//                            {{INV}}, {{/INV}} (reverse video), {{QR:data}}, {{BEEP}}.
// 5 níveis proporcionais (PP/P/M/G/GG) com diferenças graduais.
// Garante que IMPRESSÃO === PREVIEW.
import type { FormattedLine } from "@/types/printer-layout-extended";

// v1.2.0 — Mapeia fontSize → marker ESC/POS
// PP (xsmall)  → COND  (condensed mode, ~12% menor)
// P  (small)   → N     (normal 1x1)
// M  (medium)  → N     (normal 1x1 — baseline)
// G  (large)   → 2W    (double WIDTH — diferença mais sutil que 2H, cliente reclamou que era grande demais)
// GG (xlarge)  → 2X    (double width + height — grande full)
function sizeMarker(fontSize?: string): string {
  switch (fontSize) {
    case 'xsmall': return '{{COND}}';
    case 'large':  return '{{2W}}';     // antes era 2H (height) — mudou pra width
    case 'xlarge': return '{{2X}}';
    default:       return '{{N}}';
  }
}

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

    // Size — emite marker só quando muda (otimiza bytes)
    const marker = sizeMarker(f.fontSize);
    if (marker !== lastSize) {
      prefix.push(marker);
      lastSize = marker;
    }

    // Bold inline (não permanente — wrap só essa linha)
    const text = line.text ?? '';
    if (f.bold) {
      out.push(prefix.join('') + '{{B}}' + text + '{{/B}}');
    } else {
      out.push(prefix.join('') + text);
    }
  }

  // Reset no final — N cancela TODOS modos size (condensed/2H/2X)
  out.push('{{L}}{{N}}');
  return out.join('\n');
}
