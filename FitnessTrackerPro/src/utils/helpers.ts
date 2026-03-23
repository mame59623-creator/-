import { format, addDays, addWeeks, getDay, parseISO, differenceInDays, isToday, isFuture, isPast } from 'date-fns';
import { TrainingSchedule, CheatDay, BodyMeasurement } from '../types';

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: string): string {
  return format(parseISO(date), 'MMM d, yyyy');
}

export function getScheduledDatesForMonth(schedule: TrainingSchedule, year: number, month: number): string[] {
  const dates: string[] = [];
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const scheduleStart = parseISO(schedule.startDate);

  let current = new Date(start);
  while (current <= end) {
    const dateStr = formatDate(current);
    if (isDateScheduled(schedule, dateStr)) {
      dates.push(dateStr);
    }
    current = addDays(current, 1);
  }
  return dates;
}

export function isDateScheduled(schedule: TrainingSchedule, dateStr: string): boolean {
  const date = parseISO(dateStr);
  const start = parseISO(schedule.startDate);
  if (date < start) return false;
  if (schedule.endDate && date > parseISO(schedule.endDate)) return false;

  const daysDiff = differenceInDays(date, start);

  switch (schedule.recurrenceType) {
    case 'weekdays':
      return (schedule.weekdays || []).includes(getDay(date));
    case 'every_x_days':
      return daysDiff >= 0 && daysDiff % (schedule.intervalDays || 1) === 0;
    case 'every_x_weeks':
      return daysDiff >= 0 &&
        Math.floor(daysDiff / 7) % (schedule.intervalWeeks || 1) === 0 &&
        getDay(date) === (schedule.weekdayOfWeek ?? getDay(start));
    default:
      return false;
  }
}

export function getNextCheatDay(cheatDays: CheatDay[]): string | null {
  const today = formatDate(new Date());
  const futureDays = cheatDays
    .map(cd => cd.date)
    .filter(d => d >= today)
    .sort();
  return futureDays.length > 0 ? futureDays[0] : null;
}

export function getDaysUntilCheatDay(cheatDays: CheatDay[]): number | null {
  const next = getNextCheatDay(cheatDays);
  if (!next) return null;
  return differenceInDays(parseISO(next), new Date());
}

export function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
}

export function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' };
  if (bmi < 25) return { label: 'Normal', color: '#22C55E' };
  if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' };
  return { label: 'Obese', color: '#EF4444' };
}

export function calculateTotalVolume(sets: { weight: number; reps: number }[]): number {
  return sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
}

export function getLatestMeasurement(measurements: BodyMeasurement[]): BodyMeasurement | null {
  if (measurements.length === 0) return null;
  return measurements.sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function getGoalProgress(current: number, start: number, target: number): number {
  if (start === target) return 100;
  const progress = Math.abs((current - start) / (target - start)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function getProgressColor(progress: number): string {
  if (progress < 33) return '#EF4444';
  if (progress < 66) return '#F59E0B';
  if (progress < 100) return '#22C55E';
  return '#F59E0B'; // gold for achieved
}

export function getDailyNutritionTotals(meals: { entries: { calories: number; protein: number; fat: number; carbs: number }[] }[]) {
  return meals.reduce(
    (totals, meal) => {
      meal.entries.forEach(entry => {
        totals.calories += entry.calories;
        totals.protein += entry.protein;
        totals.fat += entry.fat;
        totals.carbs += entry.carbs;
      });
      return totals;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

export function getStreakCount(
  bodyMeasurements: BodyMeasurement[],
  trainingSessions: { date: string }[],
  dailyNutrition: { date: string }[]
): number {
  let streak = 0;
  let date = new Date();

  while (true) {
    const dateStr = formatDate(date);
    const hasRecord =
      bodyMeasurements.some(m => m.date === dateStr) ||
      trainingSessions.some(s => s.date === dateStr) ||
      dailyNutrition.some(n => n.date === dateStr);

    if (!hasRecord) break;
    streak++;
    date = addDays(date, -1);
  }
  return streak;
}
