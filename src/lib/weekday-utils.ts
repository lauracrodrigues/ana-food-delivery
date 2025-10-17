/**
 * Weekday utilities for product availability management
 */

export const WEEKDAYS = [
  { value: 'sunday', label: 'Domingo', short: 'Dom' },
  { value: 'monday', label: 'Segunda', short: 'Seg' },
  { value: 'tuesday', label: 'Terça', short: 'Ter' },
  { value: 'wednesday', label: 'Quarta', short: 'Qua' },
  { value: 'thursday', label: 'Quinta', short: 'Qui' },
  { value: 'friday', label: 'Sexta', short: 'Sex' },
  { value: 'saturday', label: 'Sábado', short: 'Sáb' },
] as const;

export const ALL_WEEKDAYS = WEEKDAYS.map((day) => day.value);

export type Weekday = typeof ALL_WEEKDAYS[number];

/**
 * Get current weekday in English format
 */
export const getCurrentWeekday = (): Weekday => {
  const days: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

/**
 * Check if a product is available today
 */
export const isProductAvailableToday = (availableWeekdays: string[] | null): boolean => {
  if (!availableWeekdays || availableWeekdays.length === 0) {
    return true; // If not set, assume available
  }
  const today = getCurrentWeekday();
  return availableWeekdays.includes(today);
};

/**
 * Check if a product is available on a specific day
 */
export const isProductAvailableOn = (availableWeekdays: string[] | null, weekday: Weekday): boolean => {
  if (!availableWeekdays || availableWeekdays.length === 0) {
    return true;
  }
  return availableWeekdays.includes(weekday);
};
