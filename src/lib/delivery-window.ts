// v1.0.0 — Helpers de janela de entregas (opção 2 agendamento automático)
// Detecta se hora atual está dentro do schedule semanal e calcula próximo
// horário de abertura quando fora.

interface TimeSlot { open: string; close: string; }
interface DaySchedule { enabled: boolean; periods?: TimeSlot[]; open?: string; close?: string; }
type WeekSchedule = Record<string, DaySchedule>;

const DAY_KEYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

function timeToMinutes(t: string): number {
  const { h, m } = parseTime(t);
  return h * 60 + m;
}

// Normaliza formato antigo {open,close} → {periods}
function getPeriods(day: DaySchedule | undefined): TimeSlot[] {
  if (!day || !day.enabled) return [];
  if (Array.isArray(day.periods)) return day.periods;
  if (day.open && day.close) return [{ open: day.open, close: day.close }];
  return [];
}

// Está aberto agora?
export function isOpenNow(schedule: WeekSchedule | null | undefined, now: Date = new Date()): boolean {
  if (!schedule) return true; // sem schedule = sempre aberto (fail-open)
  const dayKey = DAY_KEYS[now.getDay()];
  const periods = getPeriods(schedule[dayKey]);
  if (periods.length === 0) return false;
  const curMin = now.getHours() * 60 + now.getMinutes();
  return periods.some(p => curMin >= timeToMinutes(p.open) && curMin < timeToMinutes(p.close));
}

// Próximo horário de abertura (Date). null se schedule todo desabilitado.
export function nextOpeningTime(schedule: WeekSchedule | null | undefined, now: Date = new Date()): Date | null {
  if (!schedule) return null;
  const curMin = now.getHours() * 60 + now.getMinutes();

  // Hoje: procura próximo período cujo open > curMin
  const todayKey = DAY_KEYS[now.getDay()];
  const todayPeriods = getPeriods(schedule[todayKey]).sort((a, b) => timeToMinutes(a.open) - timeToMinutes(b.open));
  for (const p of todayPeriods) {
    const openMin = timeToMinutes(p.open);
    if (openMin > curMin) {
      const { h, m } = parseTime(p.open);
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      return d;
    }
  }

  // Próximos 7 dias: procura 1º período do 1º dia habilitado
  for (let i = 1; i <= 7; i++) {
    const next = new Date(now);
    next.setDate(next.getDate() + i);
    const dKey = DAY_KEYS[next.getDay()];
    const periods = getPeriods(schedule[dKey]).sort((a, b) => timeToMinutes(a.open) - timeToMinutes(b.open));
    if (periods.length > 0) {
      const { h, m } = parseTime(periods[0].open);
      next.setHours(h, m, 0, 0);
      return next;
    }
  }
  return null;
}

// Formata Date relativa: "hoje às 11:00" / "amanhã às 11:00" / "segunda às 11:00"
export function formatOpeningLabel(opening: Date, now: Date = new Date()): string {
  const diffDays = Math.floor((opening.getTime() - now.setHours(0,0,0,0)) / 86_400_000);
  const time = opening.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `hoje às ${time}`;
  if (diffDays === 1) return `amanhã às ${time}`;
  const dayName = opening.toLocaleDateString("pt-BR", { weekday: "long" });
  return `${dayName} às ${time}`;
}
