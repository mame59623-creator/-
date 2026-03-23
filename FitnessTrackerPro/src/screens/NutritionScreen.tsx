import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { format, parseISO } from 'date-fns';
import { Dimensions } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../utils/theme';
import { useApp } from '../store/AppContext';
import { formatDate, generateId, getDailyNutritionTotals } from '../utils/helpers';
import { Card } from '../components/Card';
import { BottomSheet } from '../components/BottomSheet';
import { ProgressBar } from '../components/ProgressBar';
import { DailyNutrition, Meal, MealEntry } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

export function NutritionScreen() {
  const { state, dispatch } = useApp();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [showAddSupplementModal, setShowAddSupplementModal] = useState(false);
  const [editingMealType, setEditingMealType] = useState<MealType>('breakfast');
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const [foodFat, setFoodFat] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');
  const [newSupplementName, setNewSupplementName] = useState('');
  const [newSupplementTime, setNewSupplementTime] = useState('');

  const today = formatDate(new Date());
  const todayNutrition = useMemo(() =>
    state.dailyNutrition.find(n => n.date === selectedDate),
    [state.dailyNutrition, selectedDate]
  );

  const totals = useMemo(() => {
    if (!todayNutrition) return { calories: 0, protein: 0, fat: 0, carbs: 0 };
    return getDailyNutritionTotals(todayNutrition.meals);
  }, [todayNutrition]);

  const isCheatDay = useMemo(() =>
    state.cheatDays.some(c => c.date === selectedDate),
    [state.cheatDays, selectedDate]
  );

  const calorieProgress = (totals.calories / state.profile.dailyCalorieGoal) * 100;
  const proteinProgress = (totals.protein / state.profile.dailyProteinGoal) * 100;

  const getProteinColor = (progress: number) => {
    if (progress < 50) return Colors.error;
    if (progress < 80) return Colors.warning;
    return Colors.success;
  };

  const openMealModal = (mealType: MealType) => {
    setEditingMealType(mealType);
    setFoodName('');
    setFoodCalories('');
    setFoodProtein('');
    setFoodFat('');
    setFoodCarbs('');
    setShowFoodModal(true);
  };

  const saveFood = () => {
    if (!foodName.trim()) return;
    const entry: MealEntry = {
      id: generateId(),
      name: foodName,
      calories: parseFloat(foodCalories) || 0,
      protein: parseFloat(foodProtein) || 0,
      fat: parseFloat(foodFat) || 0,
      carbs: parseFloat(foodCarbs) || 0,
    };

    if (todayNutrition) {
      const mealExists = todayNutrition.meals.find(m => m.type === editingMealType);
      let updatedMeals: Meal[];
      if (mealExists) {
        updatedMeals = todayNutrition.meals.map(m =>
          m.type === editingMealType ? { ...m, entries: [...m.entries, entry] } : m
        );
      } else {
        updatedMeals = [...todayNutrition.meals, {
          id: generateId(),
          type: editingMealType,
          entries: [entry],
        }];
      }
      dispatch({ type: 'UPDATE_DAILY_NUTRITION', payload: { ...todayNutrition, meals: updatedMeals } });
    } else {
      const newNutrition: DailyNutrition = {
        id: generateId(),
        date: selectedDate,
        meals: [{ id: generateId(), type: editingMealType, entries: [entry] }],
        supplementsChecked: [],
      };
      dispatch({ type: 'ADD_DAILY_NUTRITION', payload: newNutrition });
    }
    setShowFoodModal(false);
  };

  const toggleSupplement = (supplementId: string) => {
    if (todayNutrition) {
      const isChecked = todayNutrition.supplementsChecked.includes(supplementId);
      const updated = isChecked
        ? todayNutrition.supplementsChecked.filter(id => id !== supplementId)
        : [...todayNutrition.supplementsChecked, supplementId];
      dispatch({ type: 'UPDATE_DAILY_NUTRITION', payload: { ...todayNutrition, supplementsChecked: updated } });
    } else {
      const newNutrition: DailyNutrition = {
        id: generateId(),
        date: selectedDate,
        meals: [],
        supplementsChecked: [supplementId],
      };
      dispatch({ type: 'ADD_DAILY_NUTRITION', payload: newNutrition });
    }
  };

  const removeMealEntry = (mealType: MealType, entryId: string) => {
    if (!todayNutrition) return;
    const updatedMeals = todayNutrition.meals.map(m =>
      m.type === mealType ? { ...m, entries: m.entries.filter(e => e.id !== entryId) } : m
    );
    dispatch({ type: 'UPDATE_DAILY_NUTRITION', payload: { ...todayNutrition, meals: updatedMeals } });
  };

  const pieData = useMemo(() => {
    const total = totals.protein * 4 + totals.fat * 9 + totals.carbs * 4;
    if (total === 0) return null;
    return [
      { name: 'Protein', population: totals.protein * 4, color: Colors.primary, legendFontColor: Colors.textSecondary, legendFontSize: 12 },
      { name: 'Fat', population: totals.fat * 9, color: Colors.warning, legendFontColor: Colors.textSecondary, legendFontSize: 12 },
      { name: 'Carbs', population: totals.carbs * 4, color: Colors.success, legendFontColor: Colors.textSecondary, legendFontSize: 12 },
    ];
  }, [totals]);

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const checkedSupps = todayNutrition?.supplementsChecked || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutrition</Text>
        {isCheatDay && <Text style={styles.cheatDayBadge}>⭐ Cheat Day</Text>}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Daily Totals */}
        <Card style={styles.totalsCard}>
          <Text style={styles.sectionTitle}>Today's Intake</Text>

          {/* Calories */}
          <View style={styles.macroRow}>
            <View style={styles.macroLabel}>
              <Text style={styles.macroName}>Calories</Text>
              <Text style={[styles.macroValue, isCheatDay && { color: Colors.gold }]}>
                {totals.calories} / {isCheatDay && state.profile.cheatDayCalorieLimit
                  ? state.profile.cheatDayCalorieLimit
                  : state.profile.dailyCalorieGoal} kcal
              </Text>
            </View>
            <ProgressBar
              progress={calorieProgress}
              color={isCheatDay ? Colors.gold : (calorieProgress > 100 ? Colors.error : Colors.warning)}
            />
          </View>

          {/* Protein */}
          <View style={styles.macroRow}>
            <View style={styles.macroLabel}>
              <Text style={styles.macroName}>Protein</Text>
              <Text style={[styles.macroValue, { color: getProteinColor(proteinProgress) }]}>
                {totals.protein}g / {state.profile.dailyProteinGoal}g
              </Text>
            </View>
            <ProgressBar progress={proteinProgress} color={getProteinColor(proteinProgress)} />
          </View>

          {/* Fat & Carbs */}
          <View style={styles.fatCarbsRow}>
            <View style={styles.fatCarbItem}>
              <Text style={styles.macroSmallLabel}>Fat</Text>
              <Text style={[styles.macroSmallValue, { color: Colors.warning }]}>{totals.fat}g</Text>
            </View>
            <View style={styles.fatCarbItem}>
              <Text style={styles.macroSmallLabel}>Carbs</Text>
              <Text style={[styles.macroSmallValue, { color: Colors.success }]}>{totals.carbs}g</Text>
            </View>
          </View>

          {/* PFC Pie Chart */}
          {pieData && (
            <PieChart
              data={pieData}
              width={SCREEN_WIDTH - 80}
              height={140}
              chartConfig={{
                color: () => Colors.primary,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute={false}
            />
          )}
        </Card>

        {/* Meals */}
        {mealTypes.map(mealType => {
          const meal = todayNutrition?.meals.find(m => m.type === mealType);
          const mealTotals = meal ? getDailyNutritionTotals([meal]) : { calories: 0, protein: 0, fat: 0, carbs: 0 };
          return (
            <Card key={mealType} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealIcon}>{MEAL_ICONS[mealType]}</Text>
                <Text style={styles.mealName}>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</Text>
                {meal && meal.entries.length > 0 && (
                  <Text style={styles.mealCalories}>{mealTotals.calories} kcal</Text>
                )}
                <TouchableOpacity style={styles.addMealBtn} onPress={() => openMealModal(mealType)}>
                  <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {meal && meal.entries.map(entry => (
                <View key={entry.id} style={styles.foodEntry}>
                  <View style={styles.foodEntryLeft}>
                    <Text style={styles.foodName}>{entry.name}</Text>
                    <Text style={styles.foodMacros}>
                      P:{entry.protein}g F:{entry.fat}g C:{entry.carbs}g
                    </Text>
                  </View>
                  <Text style={styles.foodCalories}>{entry.calories} kcal</Text>
                  <TouchableOpacity onPress={() => removeMealEntry(mealType, entry.id)} style={{ padding: 4 }}>
                    <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          );
        })}

        {/* Supplements */}
        <Card style={styles.mealCard}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealIcon}>💊</Text>
            <Text style={styles.mealName}>Supplements</Text>
            <Text style={styles.mealCalories}>
              {checkedSupps.length}/{state.supplements.length}
            </Text>
            <TouchableOpacity style={styles.addMealBtn} onPress={() => setShowAddSupplementModal(true)}>
              <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {state.supplements.map(supp => {
            const isChecked = checkedSupps.includes(supp.id);
            return (
              <TouchableOpacity
                key={supp.id}
                style={styles.supplementRow}
                onPress={() => toggleSupplement(supp.id)}
              >
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                </View>
                <View style={styles.supplementInfo}>
                  <Text style={[styles.supplementName, isChecked && styles.supplementChecked]}>
                    {supp.name}
                  </Text>
                  {supp.timeOfDay && (
                    <Text style={styles.supplementTime}>{supp.timeOfDay}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Food Modal */}
      <BottomSheet visible={showFoodModal} onClose={() => setShowFoodModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Add to {editingMealType.charAt(0).toUpperCase() + editingMealType.slice(1)}
          </Text>
          <TextInput
            style={styles.input}
            value={foodName}
            onChangeText={setFoodName}
            placeholder="Food name"
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          <View style={styles.macroInputRow}>
            <View style={styles.macroInputItem}>
              <Text style={styles.inputLabel}>Calories</Text>
              <TextInput
                style={styles.macroInput}
                value={foodCalories}
                onChangeText={setFoodCalories}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.macroInputItem}>
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <TextInput
                style={styles.macroInput}
                value={foodProtein}
                onChangeText={setFoodProtein}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
          <View style={styles.macroInputRow}>
            <View style={styles.macroInputItem}>
              <Text style={styles.inputLabel}>Fat (g)</Text>
              <TextInput
                style={styles.macroInput}
                value={foodFat}
                onChangeText={setFoodFat}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.macroInputItem}>
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.macroInput}
                value={foodCarbs}
                onChangeText={setFoodCarbs}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={saveFood}>
            <Text style={styles.saveBtnText}>Add Food</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Add Supplement Modal */}
      <BottomSheet visible={showAddSupplementModal} onClose={() => setShowAddSupplementModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Manage Supplements</Text>
          {state.supplements.map(supp => (
            <View key={supp.id} style={styles.suppManageRow}>
              <View>
                <Text style={styles.suppManageName}>{supp.name}</Text>
                {supp.timeOfDay && <Text style={styles.suppManageTime}>{supp.timeOfDay}</Text>}
              </View>
              <TouchableOpacity onPress={() => dispatch({ type: 'DELETE_SUPPLEMENT', payload: supp.id })}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <Text style={[styles.modalTitle, { marginTop: Spacing.md, fontSize: 16 }]}>Add New Supplement</Text>
          <TextInput
            style={styles.input}
            value={newSupplementName}
            onChangeText={setNewSupplementName}
            placeholder="Supplement name"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={newSupplementTime}
            onChangeText={setNewSupplementTime}
            placeholder="Time of day (optional)"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => {
              if (!newSupplementName.trim()) return;
              dispatch({
                type: 'ADD_SUPPLEMENT',
                payload: { id: generateId(), name: newSupplementName, timeOfDay: newSupplementTime || undefined },
              });
              setNewSupplementName('');
              setNewSupplementTime('');
            }}
          >
            <Text style={styles.saveBtnText}>Add Supplement</Text>
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
  cheatDayBadge: {
    backgroundColor: Colors.gold + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    color: Colors.gold,
    fontWeight: '600',
    fontSize: 13,
  },
  totalsCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  macroRow: { marginBottom: Spacing.sm },
  macroLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroName: { color: Colors.textSecondary, fontSize: 13 },
  macroValue: { color: Colors.text, fontWeight: '700', fontSize: 13 },
  fatCarbsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs, marginBottom: Spacing.sm },
  fatCarbItem: { alignItems: 'center' },
  macroSmallLabel: { color: Colors.textMuted, fontSize: 11 },
  macroSmallValue: { fontWeight: '700', fontSize: 15 },
  mealCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  mealIcon: { fontSize: 20 },
  mealName: { color: Colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  mealCalories: { color: Colors.textSecondary, fontSize: 13 },
  addMealBtn: { padding: 4 },
  foodEntry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  foodEntryLeft: { flex: 1 },
  foodName: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  foodMacros: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  foodCalories: { color: Colors.warning, fontSize: 13, fontWeight: '600', marginRight: Spacing.xs },
  supplementRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.success, borderColor: Colors.success },
  supplementInfo: { flex: 1 },
  supplementName: { color: Colors.text, fontSize: 14 },
  supplementChecked: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  supplementTime: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  modalContent: { padding: Spacing.md },
  modalTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md },
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
  inputLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4 },
  macroInputRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  macroInputItem: { flex: 1 },
  macroInput: {
    backgroundColor: Colors.cardSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  suppManageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suppManageName: { color: Colors.text, fontSize: 14 },
  suppManageTime: { color: Colors.textMuted, fontSize: 12 },
});
