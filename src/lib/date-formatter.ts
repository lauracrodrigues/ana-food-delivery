// Helpers centralizados de formatação de datas — substitui format() inline em 13+ arquivos
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// "25/12/2024"
export const formatDateBR = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy');
};

// "25/12/2024 14:30"
export const formatDateTimeBR = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR });
};

// "25 de dezembro"
export const formatDateLong = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "dd 'de' MMMM", { locale: ptBR });
};

// "25 de dezembro de 2024"
export const formatDateFullLong = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
};

// "25/12" — compacto para gráficos
export const formatDateShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM');
};

// "14:30:00"
export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm:ss');
};

// "2024-12-25" (ISO date sem hora — para inputs type="date")
export const formatISODate = (date: Date): string => format(date, 'yyyy-MM-dd');
