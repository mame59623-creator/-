import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { format, parseISO, subDays, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
import { Colors, Spacing, BorderRadius, Typography, muscleColors } from '../utils/theme';
import { useApp } from '../store/AppContext';
import { calculateTotalVolume, formatDate, generateId } from '../utils/helpers';
import { Card } from '../components/Card';
import { BottomSheet } from '../components/BottomSheet';
import { TrainingSession, TrainingExercise, ExerciseSet, TrainingSchedule } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ActiveTab = 'log' | 'library' | 'schedule' | 'stats';

export function TrainingScreen() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('log');
  const [showLogModal, setShowLogModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Partial<TrainingSession> | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategoryId, setNewExerciseCategoryId] = useState('chest');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState('');
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleType, setNewScheduleType] = useState<'weekdays' | 'every_x_days'>('weekdays');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState('2');
  const [selectedExerciseForSession, setSelectedExerciseForSession] = useState<string | null>(null);

  const today = formatDate(new Date());
  const todaySession = useMemo(() => state.trainingSessions.find(s => s.date === today), [state.trainingSessions, today]);
  const recentSessions = useMemo(() =>
    [...state.trainingSessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [state.trainingSessions]
  );

  const weeklyVolumeData = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i));
      const weekEnd = endOfWeek(subWeeks(new Date(), i));
      const weekStartStr = formatDate(weekStart);
      const weekEndStr = formatDate(weekEnd);
      const sessions = state.trainingSessions.filter(s => s.date >= weekStartStr && s.date <= weekEndStr);
      const volume = sessions.reduce((sum, session) =>
        sum + session.exercises.reduce((s2, ex) => s2 + calculateTotalVolume(ex.sets), 0), 0
      );
      weeks.push({ label: format(weekStart, 'M/d'), volume });
    }
    return weeks;
  }, [state.trainingSessions]);

  const startNewSession = () => {
    const newSession: Partial<TrainingSession> = {
      id: generateId(),
      date: today,
      exercises: [],
    };
    setEditingSession(newSession);
    setShowLogModal(true);
  };

  const editSession = (session: TrainingSession) => {
    setEditingSession({ ...session, exercises: session.exercises.map(e => ({ ...e, sets: [...e.sets] })) });
    setShowLogModal(true);
  };

  const addExerciseToSession = () => {
    if (!selectedExerciseForSession || !editingSession) return;
    const exercise = state.exercises.find(e => e.id === selectedExerciseForSession);
    if (!exercise) return;

    const newEx: TrainingExercise = {
      id: generateId(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: [{ id: generateId(), weight: 0, reps: 0 }],
    };

    setEditingSession(prev => ({
      ...prev,
      exercises: [...(prev?.exercises || []), newEx],
    }));
    setSelectedExerciseForSession(null);
  };

  const addSetToExercise = (exerciseId: string) => {
    setEditingSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises?.map(ex =>
          ex.id === exerciseId
            ? { ...ex, sets: [...ex.sets, { id: generateId(), weight: 0, reps: 0 }] }
            : ex
        ),
      };
    });
  };

  const updateSet = (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    setEditingSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises?.map(ex =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map(s =>
                  s.id === setId ? { ...s, [field]: parseFloat(value) || 0 } : s
                ),
              }
            : ex
        ),
      };
    });
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setEditingSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises?.map(ex =>
          ex.id === exerciseId
            ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) }
            : ex
        ),
      };
    });
  };

  const removeExercise = (exerciseId: string) => {
    setEditingSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises?.filter(ex => ex.id !== exerciseId),
      };
    });
  };

  const saveSession = () => {
    if (!editingSession) return;
    const session = editingSession as TrainingSession;
    const exists = state.trainingSessions.find(s => s.id === session.id);
    if (exists) {
      dispatch({ type: 'UPDATE_TRAINING_SESSION', payload: session });
    } else {
      dispatch({ type: 'ADD_TRAINING_SESSION', payload: session });
    }
    setShowLogModal(false);
    setEditingSession(null);
  };

  const saveExercise = () => {
    if (!newExerciseName.trim()) return;
    dispatch({
      type: 'ADD_EXERCISE',
      payload: {
        id: generateId(),
        name: newExerciseName,
        categoryId: newExerciseCategoryId,
        targetMuscle: newExerciseMuscle,
      },
    });
    setNewExerciseName('');
    setNewExerciseMuscle('');
    setShowExerciseModal(false);
  };

  const saveSchedule = () => {
    if (!newScheduleName.trim()) return;
    const schedule: TrainingSchedule = {
      id: generateId(),
      name: newScheduleName,
      recurrenceType: newScheduleType,
      weekdays: newScheduleType === 'weekdays' ? selectedWeekdays : undefined,
      intervalDays: newScheduleType === 'every_x_days' ? parseInt(intervalDays) : undefined,
      startDate: today,
      notificationEnabled: false,
    };
    dispatch({ type: 'ADD_TRAINING_SCHEDULE', payload: schedule });
    setNewScheduleName('');
    setSelectedWeekdays([]);
    setShowScheduleModal(false);
  };

  const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Training</Text>
        <TouchableOpacity style={styles.addBtn} onPress={startNewSession}>
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.addBtnText}>Log Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        {(['log', 'library', 'schedule', 'stats'] as ActiveTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'log' && (
          <View>
            {/* Today's Session */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Today</Text>
              {todaySession ? (
                <TouchableOpacity onPress={() => editSession(todaySession)}>
                  <View style={styles.sessionCard}>
                    <View style={styles.sessionHeader}>
                      <Text style={styles.sessionDate}>{format(parseISO(todaySession.date), 'EEEE, MMM d')}</Text>
                      <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                    </View>
                    {todaySession.exercises.map(ex => (
                      <View key={ex.id} style={styles.exerciseRow}>
                        <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                        <Text style={styles.exerciseSets}>{ex.sets.length} sets</Text>
                        <Text style={styles.exerciseVolume}>
                          {calculateTotalVolume(ex.sets).toFixed(0)} kg vol
                        </Text>
                      </View>
                    ))}
                    <Text style={styles.totalVolume}>
                      Total: {todaySession.exercises.reduce((sum, ex) => sum + calculateTotalVolume(ex.sets), 0).toFixed(0)} kg
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.emptySession} onPress={startNewSession}>
                  <Ionicons name="barbell-outline" size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No workout logged today</Text>
                  <Text style={styles.emptySubText}>Tap to start logging</Text>
                </TouchableOpacity>
              )}
            </Card>

            {/* Recent Sessions */}
            {recentSessions.filter(s => s.date !== today).length > 0 && (
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Recent Sessions</Text>
                {recentSessions.filter(s => s.date !== today).map(session => (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.sessionCard}
                    onPress={() => editSession(session)}
                  >
                    <View style={styles.sessionHeader}>
                      <Text style={styles.sessionDate}>{format(parseISO(session.date), 'EEE, MMM d')}</Text>
                      <Text style={styles.sessionVolume}>
                        {session.exercises.reduce((sum, ex) => sum + calculateTotalVolume(ex.sets), 0).toFixed(0)} kg
                      </Text>
                    </View>
                    <Text style={styles.sessionExercises}>
                      {session.exercises.map(e => e.exerciseName).join(', ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>
        )}

        {activeTab === 'library' && (
          <View>
            <View style={styles.libraryHeader}>
              <Text style={styles.sectionTitle}>Exercise Library</Text>
              <TouchableOpacity style={styles.smallAddBtn} onPress={() => setShowExerciseModal(true)}>
                <Ionicons name="add" size={16} color={Colors.white} />
                <Text style={styles.smallAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {state.exerciseCategories.map(category => {
              const exercises = state.exercises.filter(e => e.categoryId === category.id);
              if (exercises.length === 0) return null;
              return (
                <Card key={category.id} style={styles.sectionCard}>
                  <View style={styles.categoryHeader}>
                    <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                    <Text style={[styles.categoryName, { color: category.color }]}>{category.name}</Text>
                    <Text style={styles.categoryCount}>{exercises.length}</Text>
                  </View>
                  {exercises.map(ex => (
                    <View key={ex.id} style={styles.exerciseLibRow}>
                      <Text style={styles.exerciseLibName}>{ex.name}</Text>
                      <Text style={styles.exerciseLibMuscle}>{ex.targetMuscle}</Text>
                    </View>
                  ))}
                </Card>
              );
            })}
          </View>
        )}

        {activeTab === 'schedule' && (
          <View>
            <View style={styles.libraryHeader}>
              <Text style={styles.sectionTitle}>Training Schedule</Text>
              <TouchableOpacity style={styles.smallAddBtn} onPress={() => setShowScheduleModal(true)}>
                <Ionicons name="add" size={16} color={Colors.white} />
                <Text style={styles.smallAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {state.trainingSchedules.length === 0 ? (
              <Card style={styles.sectionCard}>
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No schedules yet</Text>
                  <Text style={styles.emptySubText}>Create a recurring training plan</Text>
                </View>
              </Card>
            ) : (
              state.trainingSchedules.map(schedule => (
                <Card key={schedule.id} style={styles.sectionCard}>
                  <View style={styles.scheduleItemHeader}>
                    <Text style={styles.scheduleName}>{schedule.name}</Text>
                    <TouchableOpacity onPress={() => dispatch({ type: 'DELETE_TRAINING_SCHEDULE', payload: schedule.id })}>
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.scheduleDesc}>
                    {schedule.recurrenceType === 'weekdays'
                      ? `Every: ${(schedule.weekdays || []).map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`
                      : `Every ${schedule.intervalDays} days`}
                  </Text>
                  <Text style={styles.scheduleStart}>Starting: {format(parseISO(schedule.startDate), 'MMM d, yyyy')}</Text>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'stats' && (
          <View>
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Weekly Volume (last 4 weeks)</Text>
              {weeklyVolumeData.some(w => w.volume > 0) ? (
                <BarChart
                  data={{
                    labels: weeklyVolumeData.map(w => w.label),
                    datasets: [{ data: weeklyVolumeData.map(w => w.volume) }],
                  }}
                  width={SCREEN_WIDTH - 64}
                  height={200}
                  yAxisLabel=""
                  yAxisSuffix="kg"
                  chartConfig={{
                    backgroundColor: Colors.card,
                    backgroundGradientFrom: Colors.card,
                    backgroundGradientTo: Colors.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                    labelColor: () => Colors.textSecondary,
                  }}
                  style={{ borderRadius: BorderRadius.md }}
                />
              ) : (
                <View style={styles.noDataChart}>
                  <Text style={styles.noDataText}>No training data yet</Text>
                </View>
              )}
            </Card>

            {/* Body Part Frequency */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Muscle Group Frequency</Text>
              <Text style={styles.cardSubtitle}>Last 7 days</Text>
              {state.exerciseCategories.map(cat => {
                const catExerciseIds = state.exercises.filter(e => e.categoryId === cat.id).map(e => e.id);
                const last7Days = formatDate(subDays(new Date(), 7));
                const sessions = state.trainingSessions.filter(s => s.date >= last7Days);
                const frequency = sessions.filter(s =>
                  s.exercises.some(ex => catExerciseIds.includes(ex.exerciseId))
                ).length;
                return (
                  <View key={cat.id} style={styles.heatmapRow}>
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.heatmapLabel}>{cat.name}</Text>
                    <View style={styles.heatmapBars}>
                      {[...Array(7)].map((_, i) => {
                        const dayStr = formatDate(subDays(new Date(), 6 - i));
                        const hasSession = sessions.filter(s => s.date === dayStr).some(s =>
                          s.exercises.some(ex => catExerciseIds.includes(ex.exerciseId))
                        );
                        return (
                          <View
                            key={i}
                            style={[styles.heatmapCell, hasSession && { backgroundColor: cat.color }]}
                          />
                        );
                      })}
                    </View>
                    <Text style={[styles.heatmapFreq, { color: cat.color }]}>{frequency}x</Text>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Log Workout Modal */}
      <BottomSheet visible={showLogModal} onClose={() => { setShowLogModal(false); setEditingSession(null); }} maxHeight={700}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingSession?.date ? format(parseISO(editingSession.date), 'EEEE, MMM d') : 'Log Workout'}
            </Text>
            <TouchableOpacity style={styles.saveBtn} onPress={saveSession}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Exercise selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
            {state.exercises.map(ex => (
              <TouchableOpacity
                key={ex.id}
                style={[
                  styles.exerciseChip,
                  selectedExerciseForSession === ex.id && styles.exerciseChipActive,
                ]}
                onPress={() => setSelectedExerciseForSession(ex.id)}
              >
                <Text style={[
                  styles.exerciseChipText,
                  selectedExerciseForSession === ex.id && styles.exerciseChipTextActive,
                ]}>
                  {ex.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.addExBtn} onPress={addExerciseToSession}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addExBtnText}>Add Exercise</Text>
          </TouchableOpacity>

          <ScrollView style={{ maxHeight: 450 }}>
            {editingSession?.exercises?.map(ex => (
              <View key={ex.id} style={styles.sessionExercise}>
                <View style={styles.exerciseSessionHeader}>
                  <Text style={styles.exerciseSessionName}>{ex.exerciseName}</Text>
                  <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                    <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.setHeader}>
                  <Text style={styles.setHeaderText}>Set</Text>
                  <Text style={styles.setHeaderText}>Weight (kg)</Text>
                  <Text style={styles.setHeaderText}>Reps</Text>
                  <Text style={styles.setHeaderText}></Text>
                </View>
                {ex.sets.map((set, i) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={styles.setNum}>{i + 1}</Text>
                    <TextInput
                      style={styles.setInput}
                      value={set.weight > 0 ? String(set.weight) : ''}
                      onChangeText={v => updateSet(ex.id, set.id, 'weight', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TextInput
                      style={styles.setInput}
                      value={set.reps > 0 ? String(set.reps) : ''}
                      onChangeText={v => updateSet(ex.id, set.id, 'reps', v)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TouchableOpacity onPress={() => removeSet(ex.id, set.id)}>
                      <Ionicons name="remove-circle-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addSetBtn} onPress={() => addSetToExercise(ex.id)}>
                  <Ionicons name="add" size={14} color={Colors.primary} />
                  <Text style={styles.addSetText}>Add Set</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </BottomSheet>

      {/* Add Exercise Modal */}
      <BottomSheet visible={showExerciseModal} onClose={() => setShowExerciseModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Exercise</Text>
          <Text style={styles.inputLabel}>Exercise Name</Text>
          <TextInput
            style={styles.input}
            value={newExerciseName}
            onChangeText={setNewExerciseName}
            placeholder="e.g. Incline Bench Press"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.inputLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {state.exerciseCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.exerciseChip, newExerciseCategoryId === cat.id && { backgroundColor: cat.color }]}
                onPress={() => setNewExerciseCategoryId(cat.id)}
              >
                <Text style={[styles.exerciseChipText, newExerciseCategoryId === cat.id && { color: Colors.white }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.inputLabel}>Target Muscle</Text>
          <TextInput
            style={styles.input}
            value={newExerciseMuscle}
            onChangeText={setNewExerciseMuscle}
            placeholder="e.g. Pectorals"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity style={styles.saveBtnFull} onPress={saveExercise}>
            <Text style={styles.saveBtnText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Add Schedule Modal */}
      <BottomSheet visible={showScheduleModal} onClose={() => setShowScheduleModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Training Schedule</Text>
          <Text style={styles.inputLabel}>Schedule Name</Text>
          <TextInput
            style={styles.input}
            value={newScheduleName}
            onChangeText={setNewScheduleName}
            placeholder="e.g. Push Day"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.inputLabel}>Recurrence Type</Text>
          <View style={styles.recurrenceRow}>
            <TouchableOpacity
              style={[styles.recurrenceBtn, newScheduleType === 'weekdays' && styles.recurrenceBtnActive]}
              onPress={() => setNewScheduleType('weekdays')}
            >
              <Text style={[styles.recurrenceBtnText, newScheduleType === 'weekdays' && styles.recurrenceBtnTextActive]}>
                Specific Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.recurrenceBtn, newScheduleType === 'every_x_days' && styles.recurrenceBtnActive]}
              onPress={() => setNewScheduleType('every_x_days')}
            >
              <Text style={[styles.recurrenceBtnText, newScheduleType === 'every_x_days' && styles.recurrenceBtnTextActive]}>
                Every X Days
              </Text>
            </TouchableOpacity>
          </View>

          {newScheduleType === 'weekdays' ? (
            <View style={styles.weekdaysSelector}>
              {WEEKDAY_LABELS.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.weekdayBtn, selectedWeekdays.includes(i) && styles.weekdayBtnActive]}
                  onPress={() => setSelectedWeekdays(prev =>
                    prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                  )}
                >
                  <Text style={[styles.weekdayBtnText, selectedWeekdays.includes(i) && styles.weekdayBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              <Text style={styles.inputLabel}>Interval (days)</Text>
              <TextInput
                style={styles.input}
                value={intervalDays}
                onChangeText={setIntervalDays}
                keyboardType="number-pad"
                placeholder="e.g. 2"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          )}

          <TouchableOpacity style={styles.saveBtnFull} onPress={saveSchedule}>
            <Text style={styles.saveBtnText}>Create Schedule</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { ...Typography.h2, color: Colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    gap: 4,
  },
  addBtnText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  tabScroll: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.card,
    marginRight: Spacing.xs,
  },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  activeTabText: { color: Colors.white },
  sectionCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  cardSubtitle: { color: Colors.textSecondary, fontSize: 12, marginBottom: Spacing.sm },
  sessionCard: {
    backgroundColor: Colors.cardSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sessionDate: { color: Colors.textSecondary, fontSize: 13 },
  sessionVolume: { color: Colors.success, fontSize: 13, fontWeight: '600' },
  sessionExercises: { color: Colors.textMuted, fontSize: 12 },
  exerciseRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 2 },
  exerciseName: { flex: 1, color: Colors.text, fontSize: 13 },
  exerciseSets: { color: Colors.textSecondary, fontSize: 12 },
  exerciseVolume: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  totalVolume: { color: Colors.success, fontSize: 14, fontWeight: '700', marginTop: 4 },
  emptySession: { alignItems: 'center', padding: Spacing.xl },
  emptyState: { alignItems: 'center', padding: Spacing.xl },
  emptyText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600', marginTop: Spacing.sm },
  emptySubText: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },
  libraryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  smallAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  smallAddBtnText: { color: Colors.white, fontWeight: '600', fontSize: 12 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontWeight: '700', fontSize: 15 },
  categoryCount: { color: Colors.textMuted, fontSize: 12, marginLeft: 'auto' },
  exerciseLibRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  exerciseLibName: { flex: 1, color: Colors.text, fontSize: 14 },
  exerciseLibMuscle: { color: Colors.textSecondary, fontSize: 12 },
  scheduleItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scheduleName: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  scheduleDesc: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  scheduleStart: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  heatmapRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  heatmapLabel: { color: Colors.text, fontSize: 12, width: 70 },
  heatmapBars: { flexDirection: 'row', gap: 3, flex: 1 },
  heatmapCell: { flex: 1, height: 20, borderRadius: 3, backgroundColor: Colors.border },
  heatmapFreq: { width: 24, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  noDataChart: { alignItems: 'center', padding: Spacing.xl },
  noDataText: { color: Colors.textSecondary, fontSize: 14 },
  modalContent: { padding: Spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { ...Typography.h3, color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  saveBtnFull: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  inputLabel: { color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.cardSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  exerciseChip: {
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  exerciseChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  exerciseChipTextActive: { color: Colors.white },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  addExBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  sessionExercise: {
    backgroundColor: Colors.cardSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  exerciseSessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  exerciseSessionName: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  setHeader: { flexDirection: 'row', marginBottom: 4 },
  setHeaderText: { flex: 1, color: Colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  setNum: { flex: 1, color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },
  setInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.sm,
    padding: 6,
    color: Colors.text,
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  addSetText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  recurrenceRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  recurrenceBtn: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.cardSecondary, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  recurrenceBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  recurrenceBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  recurrenceBtnTextActive: { color: Colors.white },
  weekdaysSelector: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md, justifyContent: 'space-between' },
  weekdayBtn: { flex: 1, height: 36, borderRadius: BorderRadius.sm, backgroundColor: Colors.cardSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  weekdayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  weekdayBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  weekdayBtnTextActive: { color: Colors.white },
});
