import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, BodyMeasurement, TrainingSession, DailyNutrition, Goal, CheatDay, TrainingSchedule, Exercise, ExerciseCategory, Supplement, UserProfile } from '../types';

const STORAGE_KEY = 'fitness_tracker_data';

const defaultProfile: UserProfile = {
  name: 'User',
  height: 170,
  dateOfBirth: '1990-01-01',
  gender: 'male',
  dailyCalorieGoal: 2000,
  dailyProteinGoal: 160,
  weightUnit: 'kg',
  measurementUnit: 'cm',
  cheatDayCountdownEnabled: true,
};

const defaultCategories: ExerciseCategory[] = [
  { id: 'chest', name: 'Chest', color: '#EF4444' },
  { id: 'back', name: 'Back', color: '#3B82F6' },
  { id: 'legs', name: 'Legs', color: '#22C55E' },
  { id: 'shoulders', name: 'Shoulders', color: '#F59E0B' },
  { id: 'arms', name: 'Arms', color: '#A855F7' },
  { id: 'core', name: 'Core', color: '#F97316' },
  { id: 'cardio', name: 'Cardio', color: '#06B6D4' },
];

const defaultExercises: Exercise[] = [
  { id: 'bench_press', name: 'Bench Press', categoryId: 'chest', targetMuscle: 'Pectorals' },
  { id: 'squat', name: 'Squat', categoryId: 'legs', targetMuscle: 'Quadriceps' },
  { id: 'deadlift', name: 'Deadlift', categoryId: 'back', targetMuscle: 'Hamstrings' },
  { id: 'ohp', name: 'Overhead Press', categoryId: 'shoulders', targetMuscle: 'Deltoids' },
  { id: 'pullup', name: 'Pull Up', categoryId: 'back', targetMuscle: 'Lats' },
  { id: 'row', name: 'Barbell Row', categoryId: 'back', targetMuscle: 'Rhomboids' },
  { id: 'curl', name: 'Bicep Curl', categoryId: 'arms', targetMuscle: 'Biceps' },
  { id: 'tricep', name: 'Tricep Pushdown', categoryId: 'arms', targetMuscle: 'Triceps' },
];

const defaultSupplements: Supplement[] = [
  { id: 'whey', name: 'Whey Protein', timeOfDay: 'Morning' },
  { id: 'creatine', name: 'Creatine', timeOfDay: 'Pre-workout' },
  { id: 'multivitamin', name: 'Multivitamin', timeOfDay: 'Morning' },
  { id: 'fish_oil', name: 'Fish Oil', timeOfDay: 'Evening' },
];

const initialState: AppState = {
  profile: defaultProfile,
  bodyMeasurements: [],
  exerciseCategories: defaultCategories,
  exercises: defaultExercises,
  trainingSessions: [],
  trainingSchedules: [],
  dailyNutrition: [],
  supplements: defaultSupplements,
  goals: [],
  cheatDays: [],
};

type Action =
  | { type: 'LOAD_DATA'; payload: AppState }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'ADD_BODY_MEASUREMENT'; payload: BodyMeasurement }
  | { type: 'UPDATE_BODY_MEASUREMENT'; payload: BodyMeasurement }
  | { type: 'DELETE_BODY_MEASUREMENT'; payload: string }
  | { type: 'ADD_TRAINING_SESSION'; payload: TrainingSession }
  | { type: 'UPDATE_TRAINING_SESSION'; payload: TrainingSession }
  | { type: 'DELETE_TRAINING_SESSION'; payload: string }
  | { type: 'ADD_TRAINING_SCHEDULE'; payload: TrainingSchedule }
  | { type: 'UPDATE_TRAINING_SCHEDULE'; payload: TrainingSchedule }
  | { type: 'DELETE_TRAINING_SCHEDULE'; payload: string }
  | { type: 'ADD_DAILY_NUTRITION'; payload: DailyNutrition }
  | { type: 'UPDATE_DAILY_NUTRITION'; payload: DailyNutrition }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'ADD_CHEAT_DAY'; payload: CheatDay }
  | { type: 'DELETE_CHEAT_DAY'; payload: string }
  | { type: 'ADD_EXERCISE_CATEGORY'; payload: ExerciseCategory }
  | { type: 'ADD_EXERCISE'; payload: Exercise }
  | { type: 'ADD_SUPPLEMENT'; payload: Supplement }
  | { type: 'UPDATE_SUPPLEMENT'; payload: Supplement }
  | { type: 'DELETE_SUPPLEMENT'; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_DATA':
      return action.payload;
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case 'ADD_BODY_MEASUREMENT':
      return { ...state, bodyMeasurements: [...state.bodyMeasurements, action.payload] };
    case 'UPDATE_BODY_MEASUREMENT':
      return { ...state, bodyMeasurements: state.bodyMeasurements.map(m => m.id === action.payload.id ? action.payload : m) };
    case 'DELETE_BODY_MEASUREMENT':
      return { ...state, bodyMeasurements: state.bodyMeasurements.filter(m => m.id !== action.payload) };
    case 'ADD_TRAINING_SESSION':
      return { ...state, trainingSessions: [...state.trainingSessions, action.payload] };
    case 'UPDATE_TRAINING_SESSION':
      return { ...state, trainingSessions: state.trainingSessions.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_TRAINING_SESSION':
      return { ...state, trainingSessions: state.trainingSessions.filter(s => s.id !== action.payload) };
    case 'ADD_TRAINING_SCHEDULE':
      return { ...state, trainingSchedules: [...state.trainingSchedules, action.payload] };
    case 'UPDATE_TRAINING_SCHEDULE':
      return { ...state, trainingSchedules: state.trainingSchedules.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_TRAINING_SCHEDULE':
      return { ...state, trainingSchedules: state.trainingSchedules.filter(s => s.id !== action.payload) };
    case 'ADD_DAILY_NUTRITION':
      return { ...state, dailyNutrition: [...state.dailyNutrition, action.payload] };
    case 'UPDATE_DAILY_NUTRITION':
      return { ...state, dailyNutrition: state.dailyNutrition.map(n => n.id === action.payload.id ? action.payload : n) };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.payload] };
    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map(g => g.id === action.payload.id ? action.payload : g) };
    case 'DELETE_GOAL':
      return { ...state, goals: state.goals.filter(g => g.id !== action.payload) };
    case 'ADD_CHEAT_DAY':
      return { ...state, cheatDays: [...state.cheatDays, action.payload] };
    case 'DELETE_CHEAT_DAY':
      return { ...state, cheatDays: state.cheatDays.filter(c => c.id !== action.payload) };
    case 'ADD_EXERCISE_CATEGORY':
      return { ...state, exerciseCategories: [...state.exerciseCategories, action.payload] };
    case 'ADD_EXERCISE':
      return { ...state, exercises: [...state.exercises, action.payload] };
    case 'ADD_SUPPLEMENT':
      return { ...state, supplements: [...state.supplements, action.payload] };
    case 'UPDATE_SUPPLEMENT':
      return { ...state, supplements: state.supplements.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SUPPLEMENT':
      return { ...state, supplements: state.supplements.filter(s => s.id !== action.payload) };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    saveData(state);
  }, [state]);

  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        dispatch({ type: 'LOAD_DATA', payload: { ...initialState, ...parsed } });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const saveData = async (data: AppState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
