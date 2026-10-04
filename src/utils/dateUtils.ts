/**
 * Utilitaires de gestion des dates et calculs de semaine
 */

export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Retourne la date du lundi de la semaine courante (en partant d'une date donnée)
 */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Retourne les 7 jours de la semaine (du Lundi au Dimanche)
 */
export function getDaysOfWeek(referenceDate: Date = new Date()): Date[] {
  const monday = getMondayOfWeek(referenceDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
}

/**
 * Nom des jours abrégés en français
 */
export const SHORT_DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/**
 * Formate une date de manière conviviale (ex: "Aujourd'hui", "Hier", "Lundi 21 Septembre")
 */
export function formatFriendlyDate(ymd: string): string {
  const todayStr = formatDateYMD(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateYMD(yesterday);

  if (ymd === todayStr) return "Aujourd'hui";
  if (ymd === yesterdayStr) return "Hier";

  const d = parseDateYMD(ymd);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

/**
 * Calcule l'index du jour dans la semaine (0 pour Lundi, 6 pour Dimanche)
 */
export function getDayOfWeekIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

/**
 * Décale une date d'un nombre de jours
 */
export function shiftDateByDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Décale une date d'un nombre de semaines
 */
export function shiftDateByWeeks(date: Date, weeks: number): Date {
  return shiftDateByDays(date, weeks * 7);
}

/**
 * Vérifie si deux dates tombent dans la même semaine (du lundi au dimanche)
 */
export function isSameWeek(d1: Date, d2: Date): boolean {
  const m1 = getMondayOfWeek(d1);
  const m2 = getMondayOfWeek(d2);
  return formatDateYMD(m1) === formatDateYMD(m2);
}

/**
 * Vérifie si un lundi de référence correspond à la semaine actuelle
 */
export function isCurrentWeekMonday(mondayDate: Date): boolean {
  const currentMonday = getMondayOfWeek(new Date());
  return formatDateYMD(mondayDate) === formatDateYMD(currentMonday);
}

/**
 * Vérifie si un lundi de référence correspond à une semaine passée (terminée)
 */
export function isPastWeekMonday(mondayDate: Date): boolean {
  const currentMonday = getMondayOfWeek(new Date());
  return formatDateYMD(mondayDate) < formatDateYMD(currentMonday);
}

/**
 * Vérifie si un lundi de référence correspond à une semaine future
 */
export function isFutureWeekMonday(mondayDate: Date): boolean {
  const currentMonday = getMondayOfWeek(new Date());
  return formatDateYMD(mondayDate) > formatDateYMD(currentMonday);
}

/**
 * Formate un intervalle de semaine de manière compacte et lisible
 * Ex: "22 - 28 sept." ou "29 sept. - 5 oct." ou avec année si différente
 */
export function getWeekRangeLabel(mondayDate: Date): string {
  const sunday = new Date(mondayDate);
  sunday.setDate(mondayDate.getDate() + 6);

  const startDay = mondayDate.getDate();
  const endDay = sunday.getDate();

  const startMonth = mondayDate.toLocaleDateString('fr-FR', { month: 'short' });
  const endMonth = sunday.toLocaleDateString('fr-FR', { month: 'short' });

  const currentYear = new Date().getFullYear();
  const yearSuffix = sunday.getFullYear() !== currentYear ? ` ${sunday.getFullYear()}` : '';

  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth}${yearSuffix}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}${yearSuffix}`;
}

