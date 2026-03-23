import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format, parseISO, subDays, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Colors, Spacing, BorderRadius, Typography } from '../utils/theme';
import { useApp } from '../store/AppContext';
import {
  formatDate, getLatestMeasurement, calculateBMI, getBMICategory,
  getDailyNutritionTotals, getDaysUntilCheatDay, getStreakCount,
  calculateTotalVolume, generateId, getGoalProgress, getProgressColor,
} from '../utils/helpers';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { BottomSheet } from '../components/BottomSheet';
import { Goal } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function DashboardScreen() {
  const { state, dispatch } = useApp();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalType, setGoalType] = useState<'weight' | 'bodyFat'>('weight');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedGoal, setCelebratedGoal] = useState<Goal | null>(null);

  const today = formatDate(new Date());
  const latest = useMemo(() => getLatestMeasurement(state.bodyMeasurements), [state.bodyMeasurements]);
  const todayNutrition = useMemo(() => state.dailyNutrition.find(n => n.date === today), [state.dailyNutrition, today]);
  const todaySession = useMemo(() => state.trainingSessions.find(s => s.date === today), [state.trainingSessions, today]);

  const bmi = latest?.weight ? calculateBMI(latest.weight, state.profile.height) : null;
  const bmiInfo = bmi ? getBMICategory(bmi) : null;

  const todayTotals = useMemo(() => {
    if (!todayNutrition) return { calories: 0, protein: 0, fat: 0, carbs: 0 };
    return getDailyNutritionTotals(todayNutrition.meals);
  }, [todayNutrition]);

  const checkedSupps = todayNutrition?.supplementsChecked.length || 0;
  const daysUntilCheat = getDaysUntilCheatDay(state.cheatDays);
  const streak = useMemo(() =>
    getStreakCount(state.bodyMeasurements, state.trainingSessions, state.dailyNutrition),
    [state.bodyMeasurements, state.trainingSessions, state.dailyNutrition]
  );

  // Last 7 days weight sparkline
  const weightSparkline = useMemo(() => {
    const days = [...Array(7)].map((_, i) => formatDate(subDays(new Date(), 6 - i)));
    const data = days.map(d => {
      const m = state.bodyMeasurements.find(m => m.date === d);
      return m?.weight || null;
    });
    const filled: number[] = [];
    let last = 0;
    data.forEach(d => {
      if (d !== null) last = d;
      filled.push(last);
    });
    return filled.filter(v => v > 0).length >= 2 ? filled : null;
  }, [state.bodyMeasurements]);

  // Last 7 days calories
  const calSparkline = useMemo(() => {
    const days = [...Array(7)].map((_, i) => formatDate(subDays(new Date(), 6 - i)));
    return days.map(d => {
      const n = state.dailyNutrition.find(n => n.date === d);
      return n ? getDailyNutritionTotals(n.meals).calories : 0;
    });
  }, [state.dailyNutrition]);

  // Last 4 weeks volume
  const weeklyVolume = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const ws = formatDate(startOfWeek(subWeeks(new Date(), i)));
      const we = formatDate(endOfWeek(subWeeks(new Date(), i)));
      const vol = state.trainingSessions
        .filter(s => s.date >= ws && s.date <= we)
        .reduce((sum, s) => sum + s.exercises.reduce((s2, ex) => s2 + calculateTotalVolume(ex.sets), 0), 0);
      weeks.push({ label: format(parseISO(ws), 'M/d'), vol });
    }
    return weeks;
  }, [state.trainingSessions]);

  const avgCalories7Days = calSparkline.length > 0
    ? Math.round(calSparkline.reduce((a, b) => a + b, 0) / calSparkline.length)
    : 0;

  const avgProtein7Days = useMemo(() => {
    const days = [...Array(7)].map((_, i) => formatDate(subDays(new Date(), 6 - i)));
    const vals = days.map(d => {
      const n = state.dailyNutrition.find(n => n.date === d);
      return n ? getDailyNutritionTotals(n.meals).protein : 0;
    });
    return Math.round(vals.reduce((a, b) => a + b, 0) / 7);
  }, [state.dailyNutrition]);

  const saveGoal = () => {
    if (!goalTarget) return;
    const goal: Goal = {
      id: generateId(),
      type: goalType,
      targetValue: parseFloat(goalTarget),
      startValue: goalType === 'weight' ? latest?.weight : latest?.bodyFat,
      deadline: goalDeadline || undefined,
      achieved: false,
    };
    dispatch({ type: 'ADD_GOAL', payload: goal });
    setGoalTarget('');
    setGoalDeadline('');
    setShowGoalModal(false);
  };

  const chartConfig = {
    backgroundColor: Colors.card,
    backgroundGradientFrom: Colors.card,
    backgroundGradientTo: Colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: () => Colors.textSecondary,
    propsForDots: { r: '3', strokeWidth: '1', stroke: Colors.primary },
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.addGoalBtn} onPress={() => setShowGoalModal(true)}>
          <Ionicons name="flag-outline" size={16} color={Colors.white} />
          <Text style={styles.addGoalBtnText}>Add Goal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Today's Summary */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Today's Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Weight</Text>
              <Text style={styles.summaryValue}>{latest?.weight ?? '--'} kg</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Body Fat</Text>
              <Text style={styles.summaryValue}>{latest?.bodyFat ?? '--'}%</Text>
            </View>
            <View style={[styles.summaryItem, bmiInfo && { borderColor: bmiInfo.color }]}>
              <Text style={styles.summaryLabel}>BMI</Text>
              <Text style={[styles.summaryValue, bmiInfo && { color: bmiInfo.color }]}>
                {bmi ? bmi.toFixed(1) : '--'}
              </Text>
              {bmiInfo && <Text style={[styles.bmiLabel, { color: bmiInfo.color }]}>{bmiInfo.label}</Text>}
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Streak</Text>
              <Text style={[styles.summaryValue, { color: Colors.gold }]}>{streak}🔥</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.nutritionSummary}>
            <View>
              <Text style={styles.summaryLabel}>Calories</Text>
              <Text style={styles.nutritionValue}>
                {todayTotals.calories} / {state.profile.dailyCalorieGoal}
              </Text>
              <ProgressBar
                progress={(todayTotals.calories / state.profile.dailyCalorieGoal) * 100}
                color={Colors.warning}
                height={6}
                style={{ marginTop: 4 }}
              />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>
                {todayTotals.protein}g / {state.profile.dailyProteinGoal}g
              </Text>
              <ProgressBar
                progress={(todayTotals.protein / state.profile.dailyProteinGoal) * 100}
                color={Colors.primary}
                height={6}
                style={{ marginTop: 4 }}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.extraStats}>
            <View style={styles.extraStat}>
              <Ionicons name="medical-outline" size={16} color={Colors.success} />
              <Text style={styles.extraStatText}>
                Supplements {checkedSupps}/{state.supplements.length}
              </Text>
            </View>
            <View style={styles.extraStat}>
              <Ionicons name="barbell-outline" size={16} color={Colors.primary} />
              <Text style={styles.extraStatText}>
                {todaySession ? `${todaySession.exercises.length} exercises` : 'No workout yet'}
              </Text>
            </View>
          </View>

          {/* Cheat Day */}
          {state.profile.cheatDayCountdownEnabled && daysUntilCheat !== null && (
            <View style={styles.cheatDayCard}>
              <Text style={styles.cheatDayText}>
                {daysUntilCheat === 0
                  ? '🎉 Today is Cheat Day!'
                  : `🎉 ${daysUntilCheat} days until Cheat Day`}
              </Text>
            </View>
          )}
        </Card>

        {/* Weekly Trends */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Trends</Text>

          <View style={styles.trendRow}>
            <View style={styles.trendStat}>
              <Text style={styles.summaryLabel}>Avg Calories</Text>
              <Text style={styles.trendValue}>{avgCalories7Days}</Text>
              <Text style={styles.trendUnit}>kcal/day</Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.summaryLabel}>Avg Protein</Text>
              <Text style={[styles.trendValue, { color: Colors.primary }]}>{avgProtein7Days}</Text>
              <Text style={styles.trendUnit}>g/day</Text>
            </View>
          </View>

          {weightSparkline && (
            <View style={{ marginTop: Spacing.sm }}>
              <Text style={styles.chartLabel}>Weight (7 days)</Text>
              <LineChart
                data={{
                  labels: [...Array(weightSparkline.length)].map((_, i) =>
                    i % 2 === 0 ? format(subDays(new Date(), weightSparkline.length - 1 - i), 'M/d') : ''
                  ),
                  datasets: [{ data: weightSparkline }],
                }}
                width={SCREEN_WIDTH - 64}
                height={120}
                chartConfig={chartConfig}
                bezier
                withDots={true}
                withInnerLines={false}
                style={{ borderRadius: BorderRadius.md, marginLeft: -8 }}
              />
            </View>
          )}

          {weeklyVolume.some(w => w.vol > 0) && (
            <View style={{ marginTop: Spacing.sm }}>
              <Text style={styles.chartLabel}>Training Volume (4 weeks)</Text>
              <BarChart
                data={{
                  labels: weeklyVolume.map(w => w.label),
                  datasets: [{ data: weeklyVolume.map(w => w.vol) }],
                }}
                width={SCREEN_WIDTH - 64}
                height={120}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                }}
                style={{ borderRadius: BorderRadius.md, marginLeft: -8 }}
              />
            </View>
          )}
        </Card>

        {/* Goals */}
        {state.goals.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Goal Progress</Text>
            {state.goals.map(goal => {
              const current = goal.type === 'weight' ? latest?.weight : latest?.bodyFat;
              const progress = current !== undefined && goal.startValue !== undefined
                ? getGoalProgress(current, goal.startValue, goal.targetValue)
                : 0;
              const progressColor = getProgressColor(progress);
              const isAchieved = current !== undefined && (
                (goal.targetValue <= (goal.startValue || 999) && current <= goal.targetValue) ||
                (goal.targetValue >= (goal.startValue || 0) && current >= goal.targetValue)
              );

              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View>
                      <Text style={styles.goalName}>
                        {goal.type === 'weight' ? '⚖️ Target Weight' : '📊 Target Body Fat'}
                      </Text>
                      <Text style={styles.goalTarget}>
                        {current ?? '--'} → {goal.targetValue}{goal.type === 'weight' ? ' kg' : '%'}
                      </Text>
                    </View>
                    <View style={styles.goalActions}>
                      {isAchieved && <Text style={{ fontSize: 20 }}>🏆</Text>}
                      <TouchableOpacity onPress={() => dispatch({ type: 'DELETE_GOAL', payload: goal.id })}>
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.goalProgressRow}>
                    <ProgressBar progress={progress} color={progressColor} height={10} style={{ flex: 1 }} />
                    <Text style={[styles.goalPercent, { color: progressColor }]}>{progress.toFixed(0)}%</Text>
                  </View>
                  {goal.deadline && (
                    <Text style={styles.goalDeadline}>
                      Deadline: {format(parseISO(goal.deadline), 'MMM d, yyyy')}
                    </Text>
                  )}
                </View>
              );
            })}
          </Card>
        )}

        {/* No data state */}
        {state.trainingSessions.length === 0 && state.bodyMeasurements.length === 0 && (
          <Card style={styles.card}>
            <View style={styles.welcomeState}>
              <Text style={styles.welcomeEmoji}>💪</Text>
              <Text style={styles.welcomeTitle}>Welcome to Fitness Tracker!</Text>
              <Text style={styles.welcomeText}>
                Start by logging your body measurements, training sessions, and nutrition to see your progress here.
              </Text>
            </View>
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <BottomSheet visible={showGoalModal} onClose={() => setShowGoalModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Set a Goal</Text>

          <Text style={styles.inputLabel}>Goal Type</Text>
          <View style={styles.goalTypeRow}>
            <TouchableOpacity
              style={[styles.goalTypeBtn, goalType === 'weight' && styles.goalTypeBtnActive]}
              onPress={() => setGoalType('weight')}
            >
              <Text style={[styles.goalTypeBtnText, goalType === 'weight' && styles.goalTypeBtnTextActive]}>
                ⚖️ Weight
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.goalTypeBtn, goalType === 'bodyFat' && styles.goalTypeBtnActive]}
              onPress={() => setGoalType('bodyFat')}
            >
              <Text style={[styles.goalTypeBtnText, goalType === 'bodyFat' && styles.goalTypeBtnTextActive]}>
                📊 Body Fat
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>
            Target {goalType === 'weight' ? 'Weight (kg)' : 'Body Fat (%)'}
          </Text>
          <TextInput
            style={styles.input}
            value={goalTarget}
            onChangeText={setGoalTarget}
            keyboardType="decimal-pad"
            placeholder={goalType === 'weight' ? 'e.g. 75.0' : 'e.g. 12.0'}
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />

          <Text style={styles.inputLabel}>Deadline (optional, YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={goalDeadline}
            onChangeText={setGoalDeadline}
            placeholder="e.g. 2025-12-31"
            placeholderTextColor={Colors.textMuted}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={saveGoal}>
            <Text style={styles.saveBtnText}>Set Goal</Text>
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
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    gap: 4,
  },
  addGoalBtnText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  card: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.cardSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: { color: Colors.textSecondary, fontSize: 11, marginBottom: 2 },
  summaryValue: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  bmiLabel: { fontSize: 10, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  nutritionSummary: { gap: Spacing.sm },
  nutritionValue: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  extraStats: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  extraStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  extraStatText: { color: Colors.textSecondary, fontSize: 13 },
  cheatDayCard: {
    backgroundColor: Colors.gold + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gold + '40',
  },
  cheatDayText: { color: Colors.gold, fontWeight: '600', textAlign: 'center' },
  trendRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  trendStat: { flex: 1, backgroundColor: Colors.cardSecondary, borderRadius: BorderRadius.md, padding: Spacing.sm },
  trendValue: { color: Colors.text, fontSize: 22, fontWeight: '700', marginTop: 2 },
  trendUnit: { color: Colors.textMuted, fontSize: 11 },
  chartLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4, fontWeight: '600' },
  goalCard: {
    backgroundColor: Colors.cardSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  goalName: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  goalTarget: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  goalActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  goalProgressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goalPercent: { width: 40, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  goalDeadline: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  welcomeState: { alignItems: 'center', padding: Spacing.xl },
  welcomeEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  welcomeTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  welcomeText: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  modalContent: { padding: Spacing.md },
  modalTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md },
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
  goalTypeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  goalTypeBtn: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalTypeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  goalTypeBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  goalTypeBtnTextActive: { color: Colors.white },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
