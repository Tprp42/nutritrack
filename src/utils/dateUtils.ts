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
