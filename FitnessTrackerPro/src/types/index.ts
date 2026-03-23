export interface UserProfile {
  name: string;
  height: number; // cm
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  weightUnit: 'kg' | 'lbs';
  measurementUnit: 'cm' | 'inches';
  cheatDayCountdownEnabled: boolean;
  cheatDayCalorieLimit?: number;
}

export interface BodyMeasurement {
  id: string;
  date: string; // YYYY-MM-DD
  weight?: number;
  bodyFat?: number;
  neck?: number;
  shoulders?: number;
  chest?: number;
  leftUpperArm?: number;
  rightUpperArm?: number;
  leftForearm?: number;
  rightForearm?: number;
  waist?: number;
  hips?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
  photoUri?: string;
}

export interface ExerciseCategory {
  id: string;
  name: string;
  color: string;
}

export interface Exercise {
  id: string;
  name: string;
  categoryId: string;
  targetMuscle: string;
  notes?: string;
}

export interface ExerciseSet {
  id: string;
  weight: number;
  reps: number;
}

export interface TrainingExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: ExerciseSet[];
  notes?: string;
}

export interface TrainingSession {
  id: string;
  date: string; // YYYY-MM-DD
  exercises: TrainingExercise[];
  notes?: string;
  duration?: number; // minutes
}

export interface TrainingSchedule {
  id: string;
  name: string;
  recurrenceType: 'weekdays' | 'every_x_days' | 'every_x_weeks' | 'custom';
  weekdays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  intervalDays?: number;
  intervalWeeks?: number;
  weekdayOfWeek?: number;
  startDate: string;
  endDate?: string;
  categoryIds?: string[];
  notificationEnabled: boolean;
}

export interface MealEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  entries: MealEntry[];
}

export interface DailyNutrition {
  id: string;
  date: string; // YYYY-MM-DD
  meals: Meal[];
  supplementsChecked: string[]; // supplement IDs
}

export interface Supplement {
  id: string;
  name: string;
  timeOfDay?: string;
}

export interface Goal {
  id: string;
  type: 'weight' | 'bodyFat' | 'measurement';
  measurementKey?: keyof BodyMeasurement;
  targetValue: number;
  currentValue?: number;
  startValue?: number;
  deadline?: string;
  achieved: boolean;
}

export interface CheatDay {
  id: string;
  date: string; // YYYY-MM-DD
  isRecurring: boolean;
  recurrenceType?: 'weekly' | 'biweekly' | 'monthly';
  recurrenceDay?: number;
}

export interface AppState {
  profile: UserProfile;
  bodyMeasurements: BodyMeasurement[];
  exerciseCategories: ExerciseCategory[];
  exercises: Exercise[];
  trainingSessions: TrainingSession[];
  trainingSchedules: TrainingSchedule[];
  dailyNutrition: DailyNutrition[];
  supplements: Supplement[];
  goals: Goal[];
  cheatDays: CheatDay[];
}
