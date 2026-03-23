import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../utils/theme';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { BottomSheet } from '../components/BottomSheet';

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [name, setName] = useState(state.profile.name);
  const [height, setHeight] = useState(String(state.profile.height));
  const [dateOfBirth, setDateOfBirth] = useState(state.profile.dateOfBirth);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(String(state.profile.dailyCalorieGoal));
  const [dailyProteinGoal, setDailyProteinGoal] = useState(String(state.profile.dailyProteinGoal));
  const [cheatDayCalorieLimit, setCheatDayCalorieLimit] = useState(
    state.profile.cheatDayCalorieLimit ? String(state.profile.cheatDayCalorieLimit) : ''
  );

  const saveProfile = () => {
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: {
        name,
        height: parseFloat(height) || state.profile.height,
        dateOfBirth,
        dailyCalorieGoal: parseInt(dailyCalorieGoal) || state.profile.dailyCalorieGoal,
        dailyProteinGoal: parseInt(dailyProteinGoal) || state.profile.dailyProteinGoal,
        cheatDayCalorieLimit: cheatDayCalorieLimit ? parseInt(cheatDayCalorieLimit) : undefined,
      },
    });
    setShowProfileModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{state.profile.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{state.profile.name}</Text>
              <Text style={styles.profileDetail}>Height: {state.profile.height} cm</Text>
              <Text style={styles.profileDetail}>DOB: {state.profile.dateOfBirth}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowProfileModal(true)}>
              <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Goals */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Daily Goals</Text>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Calorie Goal</Text>
              <Text style={styles.settingValue}>{state.profile.dailyCalorieGoal} kcal</Text>
            </View>
            <TouchableOpacity onPress={() => setShowProfileModal(true)}>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.settingLabel}>Protein Goal</Text>
              <Text style={styles.settingValue}>{state.profile.dailyProteinGoal}g</Text>
            </View>
            <TouchableOpacity onPress={() => setShowProfileModal(true)}>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Cheat Day Settings */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Cheat Day</Text>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Countdown Enabled</Text>
              <Text style={styles.settingSubLabel}>Show cheat day banner on Home</Text>
            </View>
            <Switch
              value={state.profile.cheatDayCountdownEnabled}
              onValueChange={v => dispatch({ type: 'UPDATE_PROFILE', payload: { cheatDayCountdownEnabled: v } })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.settingLabel}>Cheat Day Calorie Limit</Text>
              <Text style={styles.settingValue}>
                {state.profile.cheatDayCalorieLimit ? `${state.profile.cheatDayCalorieLimit} kcal` : 'Not set'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowProfileModal(true)}>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Unit Preferences */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Units</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Weight Unit</Text>
            <View style={styles.unitToggle}>
              {(['kg', 'lbs'] as const).map(unit => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.unitBtn, state.profile.weightUnit === unit && styles.unitBtnActive]}
                  onPress={() => dispatch({ type: 'UPDATE_PROFILE', payload: { weightUnit: unit } })}
                >
                  <Text style={[styles.unitBtnText, state.profile.weightUnit === unit && styles.unitBtnTextActive]}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.settingLabel}>Measurement Unit</Text>
            <View style={styles.unitToggle}>
              {(['cm', 'inches'] as const).map(unit => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.unitBtn, state.profile.measurementUnit === unit && styles.unitBtnActive]}
                  onPress={() => dispatch({ type: 'UPDATE_PROFILE', payload: { measurementUnit: unit } })}
                >
                  <Text style={[styles.unitBtnText, state.profile.measurementUnit === unit && styles.unitBtnTextActive]}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Supplements */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Supplements ({state.supplements.length})</Text>
          {state.supplements.map(supp => (
            <View key={supp.id} style={styles.suppRow}>
              <View style={styles.suppDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.suppName}>{supp.name}</Text>
                {supp.timeOfDay && <Text style={styles.suppTime}>{supp.timeOfDay}</Text>}
              </View>
              <TouchableOpacity onPress={() => dispatch({ type: 'DELETE_SUPPLEMENT', payload: supp.id })}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <Text style={styles.hintText}>Manage supplements in the Nutrition screen</Text>
        </Card>

        {/* App Info */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.settingLabel}>Fitness Tracker Pro</Text>
            <Text style={styles.settingValue}>v1.0.0</Text>
          </View>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <BottomSheet visible={showProfileModal} onClose={() => setShowProfileModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Profile</Text>

          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
            placeholder="e.g. 175"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="e.g. 1990-01-15"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Daily Calorie Goal (kcal)</Text>
          <TextInput
            style={styles.input}
            value={dailyCalorieGoal}
            onChangeText={setDailyCalorieGoal}
            keyboardType="number-pad"
            placeholder="e.g. 2000"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Daily Protein Goal (g)</Text>
          <TextInput
            style={styles.input}
            value={dailyProteinGoal}
            onChangeText={setDailyProteinGoal}
            keyboardType="number-pad"
            placeholder="e.g. 160"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Cheat Day Calorie Limit (optional)</Text>
          <TextInput
            style={styles.input}
            value={cheatDayCalorieLimit}
            onChangeText={setCheatDayCalorieLimit}
            keyboardType="number-pad"
            placeholder="e.g. 3000"
            placeholderTextColor={Colors.textMuted}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
            <Text style={styles.saveBtnText}>Save Profile</Text>
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
  closeBtn: { padding: 6 },
  card: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: 24, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  profileDetail: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: { color: Colors.text, fontSize: 14 },
  settingSubLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  settingValue: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  unitToggle: { flexDirection: 'row', gap: 4 },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  unitBtnTextActive: { color: Colors.white },
  suppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suppDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  suppName: { color: Colors.text, fontSize: 14 },
  suppTime: { color: Colors.textMuted, fontSize: 11 },
  hintText: { color: Colors.textMuted, fontSize: 11, marginTop: Spacing.xs, fontStyle: 'italic' },
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
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
