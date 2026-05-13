// Helpers centralizados de status — substitui duplicações em Financeiro, Customers, PDV
import { Banknote, QrCode, CreditCard, DollarSign, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { isPast, isToday, parseISO } from 'date-fns';

// ────────────────────────────────────────────────────────────
// Formas de pagamento

export function getPaymentIcon(type: string | null): LucideIcon {
  switch (type) {
    case 'cash':           return Banknote;
    case 'pix':            return QrCode;
    case 'credit':
    case 'debit':          return CreditCard;
    case 'credit_customer': return Clock;
    default:               return DollarSign;
  }
}

export function getPaymentLabel(type: string | null, name?: string): string {
  if (name) return name;
  switch (type) {
    case 'cash':            return 'Dinheiro';
    case 'pix':             return 'PIX';
    case 'credit':          return 'Crédito';
    case 'debit':           return 'Débito';
    case 'pix_mp':          return 'PIX (MP)';
    case 'credit_customer': return 'Prazo / Crédito';
    default:                return 'Outros';
  }
}

// ────────────────────────────────────────────────────────────
// Status de Contas a Receber (Customers)
// 'today' = vence hoje (azul), 'overdue' = vencida (vermelho),
// 'paid' = paga (verde), 'pending' = futura (cinza)

export type ARStatusKey = 'overdue' | 'paid' | 'today' | 'pending';

export function getARStatus(ar: {
  status: string; due_date: string;
}): ARStatusKey {
  if (ar.status === 'paid' || ar.status === 'cancelled') return 'paid';
  const due = parseISO(ar.due_date);
  if (isToday(due)) return 'today';
  if (isPast(due))  return 'overdue';
  return 'pending';
}

export const AR_ROW_CLASS: Record<ARStatusKey, string> = {
  overdue: 'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500',
  paid:    'bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500',
  today:   'bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500',
  pending: 'border-l-4 border-l-gray-300 dark:border-l-gray-600',
};

export const AR_BADGE: Record<ARStatusKey, { label: string; class: string }> = {
  overdue: { label: 'Vencida',    class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  paid:    { label: 'Paga',       class: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  today:   { label: 'Vence Hoje', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  pending: { label: 'A Vencer',   class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

// ────────────────────────────────────────────────────────────
// Status de Contas a Pagar (Financeiro)
// 'overdue' = vencida (vermelho), 'pending' = amarelo, 'paid' = verde

export type BillStatusKey = 'overdue' | 'pending' | 'paid' | 'cancelled';

export function getBillStatus(bill: {
  status: string; due_date: string | null;
}): BillStatusKey {
  if (bill.status === 'paid')      return 'paid';
  if (bill.status === 'cancelled') return 'cancelled';
  if (bill.due_date) {
    const due = parseISO(bill.due_date);
    if (isPast(due) && !isToday(due)) return 'overdue';
  }
  return 'pending';
}

export const BILL_STATUS_CLASS: Record<BillStatusKey, string> = {
  overdue:   'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500',
  pending:   'border-l-4 border-l-yellow-400',
  paid:      'bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500',
  cancelled: 'bg-muted/30 border-l-4 border-l-gray-300',
};
