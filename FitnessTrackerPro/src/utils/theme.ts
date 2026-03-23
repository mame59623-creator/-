export const Colors = {
  background: '#0F172A',
  card: '#1E293B',
  cardSecondary: '#263548',
  border: '#334155',
  primary: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: '#A855F7',
  orange: '#F97316',
  cyan: '#06B6D4',
  gold: '#EAB308',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  white: '#FFFFFF',
};

export const muscleColors: { [key: string]: string } = {
  chest: '#EF4444',
  back: '#3B82F6',
  legs: '#22C55E',
  shoulders: '#F59E0B',
  arms: '#A855F7',
  core: '#F97316',
  cardio: '#06B6D4',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  tiny: { fontSize: 10, fontWeight: '400' as const },
};
