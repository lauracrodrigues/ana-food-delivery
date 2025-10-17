/**
 * Encurta nomes longos mantendo apenas primeiro nome + iniciais
 * Exemplo: "João Pedro da Silva" → "João P. S."
 */
export function shortenName(fullName: string, maxLength = 20): string {
  if (!fullName) return '';
  
  const parts = fullName.trim().split(' ').filter(p => p.length > 0);
  
  if (parts.length <= 1) return fullName;
  
  const firstName = parts[0];
  const lastNames = parts.slice(1).map(n => n[0].toUpperCase() + '.').join(' ');
  
  const shortened = `${firstName} ${lastNames}`;
  
  return shortened.length > maxLength ? firstName : shortened;
}

/**
 * Trunca texto com reticências se exceder o tamanho máximo
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Formata telefone para exibição em cupom
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  
  return phone;
}
