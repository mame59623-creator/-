import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO, isSameDay } from 'date-fns';
import { Colors, Spacing, BorderRadius, Typography } from '../utils/theme';
import { useApp } from '../store/AppContext';
import { getDaysUntilCheatDay, formatDate, isDateScheduled, generateId } from '../utils/helpers';
import { Card } from '../components/Card';
import { BottomSheet } from '../components/BottomSheet';
import { SettingsScreen } from './SettingsScreen';
import { CheatDay } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 32) / 7);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HomeScreen() {
  const { state, dispatch } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showCheatDayModal, setShowCheatDayModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const today = formatDate(new Date());
  const daysUntilCheat = useMemo(() => getDaysUntilCheatDay(state.cheatDays), [state.cheatDays]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startWeekday = getDay(start);
    const blanks = Array(startWeekday).fill(null);
    return [...blanks, ...days];
  }, [currentMonth]);

  const getDayIndicators = (date: Date) => {
    const dateStr = formatDate(date);
    const hasMeasurement = state.bodyMeasurements.some(m => m.date === dateStr);
    const hasTraining = state.trainingSessions.some(s => s.date === dateStr);
    const hasNutrition = state.dailyNutrition.some(n => n.date === dateStr);
    const isCheatDay = state.cheatDays.some(c => c.date === dateStr);
    const isScheduled = state.trainingSchedules.some(s => isDateScheduled(s, dateStr));
    return { hasMeasurement, hasTraining, hasNutrition, isCheatDay, isScheduled };
  };

  const getDaySummary = (dateStr: string) => {
    const measurement = state.bodyMeasurements.find(m => m.date === dateStr);
    const training = state.trainingSessions.find(s => s.date === dateStr);
    const nutrition = state.dailyNutrition.find(n => n.date === dateStr);
    const isCheatDay = state.cheatDays.some(c => c.date === dateStr);
    const totalCals = nutrition ? nutrition.meals.reduce((sum, meal) => sum + meal.entries.reduce((s, e) => s + e.calories, 0), 0) : 0;
    const totalProtein = nutrition ? nutrition.meals.reduce((sum, meal) => sum + meal.entries.reduce((s, e) => s + e.protein, 0), 0) : 0;
    const checkedSupps = nutrition ? nutrition.supplementsChecked.length : 0;
    return { measurement, training, nutrition, isCheatDay, totalCals, totalProtein, checkedSupps };
  };

  const upcomingSchedules = useMemo(() => {
    const upcoming = [];
    for (let i = 0; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = formatDate(d);
      for (const schedule of state.trainingSchedules) {
        if (isDateScheduled(schedule, dateStr)) {
          upcoming.push({ date: dateStr, schedule });
        }
      }
    }
    return upcoming.slice(0, 5);
  }, [state.trainingSchedules]);

  const handleAddCheatDay = () => {
    if (!selectedDate) return;
    const exists = state.cheatDays.find(c => c.date === selectedDate);
    if (exists) {
      dispatch({ type: 'DELETE_CHEAT_DAY', payload: exists.id });
    } else {
      const cheatDay: CheatDay = {
        id: generateId(),
        date: selectedDate,
        isRecurring: false,
      };
      dispatch({ type: 'ADD_CHEAT_DAY', payload: cheatDay });
    }
    setShowCheatDayModal(false);
  };

  const renderDay = (day: Date | null, index: number) => {
    if (!day) return <View key={`blank-${index}`} style={[styles.dayCell, { opacity: 0 }]} />;

    const dateStr = formatDate(day);
    const isToday = dateStr === today;
    const isSelected = dateStr === selectedDate;
    const { hasMeasurement, hasTraining, hasNutrition, isCheatDay, isScheduled } = getDayIndicators(day);
    const dayNum = format(day, 'd');

    return (
      <TouchableOpacity
        key={dateStr}
        style={[
          styles.dayCell,
          isToday && styles.todayCell,
          isSelected && styles.selectedCell,
          isCheatDay && styles.cheatDayCell,
        ]}
        onPress={() => {
          setSelectedDate(dateStr);
          setShowDayModal(true);
        }}
        onLongPress={() => {
          setSelectedDate(dateStr);
          setShowCheatDayModal(true);
        }}
      >
        <Text style={[
          styles.dayNumber,
          isToday && styles.todayText,
          isSelected && styles.selectedText,
        ]}>
          {isCheatDay ? '⭐' : dayNum}
        </Text>
        {isCheatDay && <Text style={styles.cheatDayNum}>{dayNum}</Text>}
        <View style={styles.indicators}>
          {hasMeasurement && <View style={[styles.dot, { backgroundColor: Colors.primary }]} />}
          {hasTraining && <View style={[styles.dot, { backgroundColor: Colors.success }]} />}
          {hasNutrition && <View style={[styles.dot, { backgroundColor: Colors.orange }]} />}
          {isScheduled && !hasTraining && <View style={[styles.dot, { backgroundColor: Colors.purple }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  const summary = selectedDate ? getDaySummary(selectedDate) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fitness Tracker</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Cheat Day Countdown */}
        {state.profile.cheatDayCountdownEnabled && daysUntilCheat !== null && (
          <View style={styles.cheatDayBanner}>
            <View style={styles.cheatDayBannerContent}>
              <Text style={styles.cheatDayBannerText}>
                {daysUntilCheat === 0
                  ? '🎉 Today is Cheat Day! Enjoy!'
                  : `🎉 ${daysUntilCheat} day${daysUntilCheat !== 1 ? 's' : ''} until Cheat Day!`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => dispatch({ type: 'UPDATE_PROFILE', payload: { cheatDayCountdownEnabled: false } })}>
              <Ionicons name="close" size={18} color={Colors.gold} />
            </TouchableOpacity>
          </View>
        )}

        {/* Calendar */}
        <Card style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => setCurrentMonth(m => subMonths(m, 1))}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
            <TouchableOpacity onPress={() => setCurrentMonth(m => addMonths(m, 1))}>
              <Ionicons name="chevron-forward" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map(day => (
              <Text key={day} style={styles.weekdayLabel}>{day}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((day, i) => renderDay(day, i))}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.legendText}>Body</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>Training</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: Colors.orange }]} />
              <Text style={styles.legendText}>Nutrition</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: Colors.purple }]} />
              <Text style={styles.legendText}>Scheduled</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={{ fontSize: 12 }}>⭐</Text>
              <Text style={styles.legendText}>Cheat Day</Text>
            </View>
          </View>
        </Card>

        {/* Upcoming Schedules */}
        {upcomingSchedules.length > 0 && (
          <Card style={{ marginHorizontal: Spacing.md, marginTop: Spacing.md }}>
            <Text style={styles.sectionTitle}>Upcoming Training</Text>
            {upcomingSchedules.map((item, i) => (
              <View key={i} style={styles.scheduleItem}>
                <View style={[styles.scheduleDot, { backgroundColor: Colors.purple }]} />
                <View>
                  <Text style={styles.scheduleDate}>{format(parseISO(item.date), 'EEE, MMM d')}</Text>
                  <Text style={styles.scheduleName}>{item.schedule.name}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Day Summary Modal */}
      <BottomSheet visible={showDayModal} onClose={() => setShowDayModal(false)}>
        {selectedDate && summary && (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM d') : ''}</Text>

            {summary.isCheatDay && (
              <View style={styles.cheatDayTag}>
                <Text style={styles.cheatDayTagText}>⭐ Cheat Day</Text>
              </View>
            )}

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Body</Text>
              {summary.measurement ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Weight:</Text>
                  <Text style={styles.summaryValue}>{summary.measurement.weight ?? '-'} kg</Text>
                  <Text style={styles.summaryLabel}>Body Fat:</Text>
                  <Text style={styles.summaryValue}>{summary.measurement.bodyFat ?? '-'}%</Text>
                </View>
              ) : (
                <Text style={styles.noDataText}>No body data recorded</Text>
              )}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Training</Text>
              {summary.training ? (
                <View>
                  {summary.training.exercises.map((ex, i) => (
                    <Text key={i} style={styles.summaryValue}>• {ex.exerciseName} ({ex.sets.length} sets)</Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.noDataText}>No training recorded</Text>
              )}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>Nutrition</Text>
              {summary.nutrition ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Calories:</Text>
                  <Text style={styles.summaryValue}>{summary.totalCals} kcal</Text>
                  <Text style={styles.summaryLabel}>Protein:</Text>
                  <Text style={styles.summaryValue}>{summary.totalProtein}g</Text>
                </View>
              ) : (
                <Text style={styles.noDataText}>No nutrition logged</Text>
              )}
            </View>

            {summary.checkedSupps > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>Supplements</Text>
                <Text style={styles.summaryValue}>{summary.checkedSupps} / {state.supplements.length} taken</Text>
              </View>
            )}
          </View>
        )}
      </BottomSheet>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide">
        <SettingsScreen onClose={() => setShowSettings(false)} />
      </Modal>

      {/* Cheat Day Modal */}
      <BottomSheet visible={showCheatDayModal} onClose={() => setShowCheatDayModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {selectedDate ? format(parseISO(selectedDate), 'MMMM d') : ''}
          </Text>
          <Text style={styles.modalSubtitle}>
            {state.cheatDays.some(c => c.date === selectedDate)
              ? 'This is a cheat day. Remove it?'
              : 'Mark this date as a cheat day?'}
          </Text>
          <TouchableOpacity style={styles.actionBtn} onPress={handleAddCheatDay}>
            <Text style={styles.actionBtnText}>
              {state.cheatDays.some(c => c.date === selectedDate) ? '❌ Remove Cheat Day' : '⭐ Mark as Cheat Day'}
            </Text>
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
  headerBtn: { padding: Spacing.xs },
  cheatDayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: '#2D2500',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  cheatDayBannerContent: { flex: 1 },
  cheatDayBannerText: { color: Colors.gold, fontWeight: '600', fontSize: 14 },
  calendarCard: { marginHorizontal: Spacing.md },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  monthTitle: { ...Typography.h3, color: Colors.text },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  weekdayLabel: {
    width: DAY_SIZE,
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    marginBottom: 2,
  },
  todayCell: {
    backgroundColor: Colors.primary + '30',
  },
  selectedCell: {
    backgroundColor: Colors.primary + '50',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  cheatDayCell: {
    backgroundColor: Colors.gold + '20',
  },
  dayNumber: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  todayText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  selectedText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  cheatDayNum: {
    position: 'absolute',
    bottom: 2,
    fontSize: 8,
    color: Colors.gold,
  },
  indicators: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  scheduleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scheduleDate: { color: Colors.textSecondary, fontSize: 12 },
  scheduleName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  modalContent: { padding: Spacing.md },
  modalTitle: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.sm },
  modalSubtitle: { color: Colors.textSecondary, marginBottom: Spacing.md },
  summarySection: { marginBottom: Spacing.md },
  summarySectionTitle: { ...Typography.h4, color: Colors.primary, marginBottom: Spacing.xs },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  summaryLabel: { color: Colors.textSecondary, fontSize: 13 },
  summaryValue: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  noDataText: { color: Colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  cheatDayTag: {
    backgroundColor: Colors.gold + '20',
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  cheatDayTagText: { color: Colors.gold, fontWeight: '600' },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
