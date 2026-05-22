// v1.0.0 — Validação de número WhatsApp brasileiro
// WhatsApp só funciona em CELULAR (DDD + 9XXXXXXXX). Fixo (8 dígitos) NÃO tem WhatsApp.

// Detecta se número tem chance de ter WhatsApp (celular brasileiro)
export function isWhatsAppEligible(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const digits = raw.replace(/\D/g, '');
  // Remove código país 55 se presente
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  // Celular BR: DDD (2 dígitos) + 9XXXXXXXX (9 dígitos começando com 9) = 11 dígitos total
  return local.length === 11 && local.charAt(2) === '9';
}

// Pega 1º número WhatsApp-eligível entre opções (whatsapp > phone)
export function pickWhatsAppNumber(company: { whatsapp?: string | null; phone?: string | null }): string | null {
  if (isWhatsAppEligible(company.whatsapp)) return company.whatsapp!;
  if (isWhatsAppEligible(company.phone)) return company.phone!;
  return null;
}
