import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Colors, Spacing, BorderRadius, Typography } from '../utils/theme';
import { useApp } from '../store/AppContext';
import { calculateBMI, getBMICategory, formatDate, generateId, getLatestMeasurement } from '../utils/helpers';
import { Card } from '../components/Card';
import { BottomSheet } from '../components/BottomSheet';
import { ProgressBar } from '../components/ProgressBar';
import { BodyModel, MeasurementZone } from '../components/BodyModel';
import { BodyMeasurement } from '../types';
import { format, subDays, parseISO, subMonths } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MEASUREMENT_LABELS: { [key: string]: string } = {
  neck: 'Neck',
  shoulders: 'Shoulders',
  chest: 'Chest',
  leftUpperArm: 'Left Upper Arm',
  rightUpperArm: 'Right Upper Arm',
  leftForearm: 'Left Forearm',
  rightForearm: 'Right Forearm',
  waist: 'Waist',
  hips: 'Hips',
  leftThigh: 'Left Thigh',
  rightThigh: 'Right Thigh',
  leftCalf: 'Left Calf',
  rightCalf: 'Right Calf',
};

type ChartRange = '1W' | '1M' | '3M' | '6M' | '1Y';

export function BodyScreen() {
  const { state, dispatch } = useApp();
  const [selectedZone, setSelectedZone] = useState<MeasurementZone | null>(null);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [measurementValue, setMeasurementValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [bodyFatValue, setBodyFatValue] = useState('');
  const [chartRange, setChartRange] = useState<ChartRange>('1M');
  const [chartMetric, setChartMetric] = useState<'weight' | 'bodyFat'>('weight');
  const [activeTab, setActiveTab] = useState<'measurements' | 'graphs'>('measurements');

  const today = formatDate(new Date());
  const latest = useMemo(() => getLatestMeasurement(state.bodyMeasurements), [state.bodyMeasurements]);
  const todayMeasurement = useMemo(() => state.bodyMeasurements.find(m => m.date === today), [state.bodyMeasurements, today]);

  const bmi = latest?.weight ? calculateBMI(latest.weight, state.profile.height) : null;
  const bmiInfo = bmi ? getBMICategory(bmi) : null;

  const currentMeasurements = todayMeasurement || latest || {};

  const getMeasurementsForChart = () => {
    let days: number;
    switch (chartRange) {
      case '1W': days = 7; break;
      case '1M': days = 30; break;
      case '3M': days = 90; break;
      case '6M': days = 180; break;
      case '1Y': days = 365; break;
      default: days = 30;
    }
    const cutoff = formatDate(subDays(new Date(), days));
    return state.bodyMeasurements
      .filter(m => m.date >= cutoff && m[chartMetric] !== undefined)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const chartData = useMemo(() => {
    const data = getMeasurementsForChart();
    if (data.length < 2) return null;
    return {
      labels: data.map(d => format(parseISO(d.date), 'M/d')),
      datasets: [{ data: data.map(d => (d[chartMetric] as number) || 0) }],
    };
  }, [state.bodyMeasurements, chartRange, chartMetric]);

  const handleZoneTap = (zone: MeasurementZone) => {
    setSelectedZone(zone);
    const existingValue = (currentMeasurements as any)[zone.key];
    setMeasurementValue(existingValue ? String(existingValue) : '');
    setShowMeasurementModal(true);
  };

  const saveMeasurement = () => {
    const value = parseFloat(measurementValue);
    if (isNaN(value)) return;

    if (todayMeasurement) {
      dispatch({
        type: 'UPDATE_BODY_MEASUREMENT',
        payload: { ...todayMeasurement, [selectedZone!.key]: value },
      });
    } else {
      const newMeasurement: BodyMeasurement = {
        id: generateId(),
        date: today,
        [selectedZone!.key]: value,
      };
      dispatch({ type: 'ADD_BODY_MEASUREMENT', payload: newMeasurement });
    }
    setShowMeasurementModal(false);
    setMeasurementValue('');
  };

  const saveWeightBodyFat = () => {
    const weight = parseFloat(weightValue);
    const bodyFat = parseFloat(bodyFatValue);

    if (todayMeasurement) {
      dispatch({
        type: 'UPDATE_BODY_MEASUREMENT',
        payload: {
          ...todayMeasurement,
          ...(weightValue ? { weight } : {}),
          ...(bodyFatValue ? { bodyFat } : {}),
        },
      });
    } else {
      const newMeasurement: BodyMeasurement = {
        id: generateId(),
        date: today,
        ...(weightValue ? { weight } : {}),
        ...(bodyFatValue ? { bodyFat } : {}),
      };
      dispatch({ type: 'ADD_BODY_MEASUREMENT', payload: newMeasurement });
    }
    setShowWeightModal(false);
    setWeightValue('');
    setBodyFatValue('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Body</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowWeightModal(true)}>
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.addBtnText}>Log Today</Text>
        </TouchableOpacity>
      </View>

      {/* Weight & BMI Card */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Weight</Text>
          <Text style={styles.statValue}>{latest?.weight ?? '--'} kg</Text>
          <Text style={styles.statDate}>{latest?.date ? format(parseISO(latest.date), 'M/d') : 'No data'}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Body Fat</Text>
          <Text style={styles.statValue}>{latest?.bodyFat ?? '--'}%</Text>
        </Card>
        <Card style={[styles.statCard, ...(bmiInfo ? [{ borderColor: bmiInfo.color }] : [])]}>
          <Text style={styles.statLabel}>BMI</Text>
          <Text style={[styles.statValue, bmiInfo && { color: bmiInfo.color }]}>
            {bmi ? bmi.toFixed(1) : '--'}
          </Text>
          {bmiInfo && <Text style={[styles.bmiLabel, { color: bmiInfo.color }]}>{bmiInfo.label}</Text>}
        </Card>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'measurements' && styles.activeTab]}
          onPress={() => setActiveTab('measurements')}
        >
          <Text style={[styles.tabText, activeTab === 'measurements' && styles.activeTabText]}>Measurements</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'graphs' && styles.activeTab]}
          onPress={() => setActiveTab('graphs')}
        >
          <Text style={[styles.tabText, activeTab === 'graphs' && styles.activeTabText]}>Graphs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'measurements' ? (
          <View>
            {/* Body Model */}
            <Card style={styles.bodyModelCard}>
              <BodyModel
                measurements={currentMeasurements as any}
                onZoneTap={handleZoneTap}
                view="front"
              />
            </Card>

            {/* Measurement List */}
            <Card style={styles.measureList}>
              <Text style={styles.sectionTitle}>Today's Measurements</Text>
              {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => {
                const value = (currentMeasurements as any)[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.measureRow}
                    onPress={() => handleZoneTap({ key, label, x: 50, y: 50 })}
                  >
                    <Text style={styles.measureName}>{label}</Text>
                    <Text style={[styles.measureValue, !value && styles.noValue]}>
                      {value ? `${value} cm` : '-- cm'}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </Card>
          </View>
        ) : (
          <View>
            {/* Chart Controls */}
            <View style={styles.chartControls}>
              <View style={styles.metricToggle}>
                <TouchableOpacity
                  style={[styles.metricBtn, chartMetric === 'weight' && styles.activeMetricBtn]}
                  onPress={() => setChartMetric('weight')}
                >
                  <Text style={[styles.metricBtnText, chartMetric === 'weight' && styles.activeMetricBtnText]}>
                    Weight
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.metricBtn, chartMetric === 'bodyFat' && styles.activeMetricBtn]}
                  onPress={() => setChartMetric('bodyFat')}
                >
                  <Text style={[styles.metricBtnText, chartMetric === 'bodyFat' && styles.activeMetricBtnText]}>
                    Body Fat
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rangeToggle}>
                {(['1W', '1M', '3M', '6M', '1Y'] as ChartRange[]).map(range => (
                  <TouchableOpacity
                    key={range}
                    style={[styles.rangeBtn, chartRange === range && styles.activeRangeBtn]}
                    onPress={() => setChartRange(range)}
                  >
                    <Text style={[styles.rangeBtnText, chartRange === range && styles.activeRangeBtnText]}>
                      {range}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Card style={{ marginHorizontal: Spacing.md, marginTop: Spacing.sm }}>
              {chartData ? (
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - 64}
                  height={200}
                  chartConfig={{
                    backgroundColor: Colors.card,
                    backgroundGradientFrom: Colors.card,
                    backgroundGradientTo: Colors.card,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    labelColor: () => Colors.textSecondary,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary },
                  }}
                  bezier
                  style={{ borderRadius: BorderRadius.md }}
                />
              ) : (
                <View style={styles.noDataChart}>
                  <Ionicons name="analytics-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.noDataText}>Not enough data to display chart</Text>
                  <Text style={styles.noDataSubText}>Log at least 2 measurements to see trends</Text>
                </View>
              )}
            </Card>

            {/* Goals Progress */}
            {state.goals.filter(g => g.type === 'weight' || g.type === 'bodyFat').length > 0 && (
              <Card style={{ marginHorizontal: Spacing.md, marginTop: Spacing.md }}>
                <Text style={styles.sectionTitle}>Goal Progress</Text>
                {state.goals.filter(g => g.type === 'weight' || g.type === 'bodyFat').map(goal => {
                  const current = goal.type === 'weight' ? latest?.weight : latest?.bodyFat;
                  const progress = current && goal.startValue
                    ? Math.min(100, Math.abs((current - (goal.startValue || 0)) / (goal.targetValue - (goal.startValue || 0))) * 100)
                    : 0;
                  return (
                    <View key={goal.id} style={{ marginBottom: Spacing.sm }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: Colors.text, fontSize: 13 }}>
                          {goal.type === 'weight' ? 'Target Weight' : 'Target Body Fat'}: {goal.targetValue}{goal.type === 'weight' ? ' kg' : '%'}
                        </Text>
                        <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
                          {current ? `${current} → ${goal.targetValue}` : 'No data'}
                        </Text>
                      </View>
                      <ProgressBar progress={progress} color={Colors.success} />
                    </View>
                  );
                })}
              </Card>
            )}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Measurement Input Modal */}
      <BottomSheet visible={showMeasurementModal} onClose={() => setShowMeasurementModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{selectedZone?.label}</Text>
          <Text style={styles.modalSubtitle}>Enter circumference in cm</Text>
          <TextInput
            style={styles.input}
            value={measurementValue}
            onChangeText={setMeasurementValue}
            keyboardType="decimal-pad"
            placeholder="e.g. 38.5"
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveMeasurement}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Weight / Body Fat Modal */}
      <BottomSheet visible={showWeightModal} onClose={() => setShowWeightModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Log Today's Stats</Text>
          <Text style={styles.inputLabel}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={weightValue}
            onChangeText={setWeightValue}
            keyboardType="decimal-pad"
            placeholder={latest?.weight ? String(latest.weight) : 'e.g. 75.5'}
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.inputLabel}>Body Fat (%)</Text>
          <TextInput
            style={styles.input}
            value={bodyFatValue}
            onChangeText={setBodyFatValue}
            keyboardType="decimal-pad"
            placeholder={latest?.bodyFat ? String(latest.bodyFat) : 'e.g. 15.0'}
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveWeightBodyFat}>
            <Text style={styles.saveBtnText}>Save</Text>
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statLabel: { color: Colors.textSecondary, fontSize: 11, marginBottom: 2 },
  statValue: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  statDate: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  bmiLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.sm },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  activeTabText: { color: Colors.white },
  bodyModelCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
  measureList: { marginHorizontal: Spacing.md },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  measureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  measureName: { flex: 1, color: Colors.text, fontSize: 14 },
  measureValue: { color: Colors.primary, fontWeight: '600', fontSize: 14, marginRight: Spacing.xs },
  noValue: { color: Colors.textMuted },
  chartControls: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  metricToggle: { flexDirection: 'row', gap: Spacing.sm },
  metricBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.card,
  },
  activeMetricBtn: { backgroundColor: Colors.primary },
  metricBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  activeMetricBtnText: { color: Colors.white },
  rangeToggle: { flexDirection: 'row', gap: Spacing.xs },
  rangeBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  activeRangeBtn: { backgroundColor: Colors.primary },
  rangeBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 12 },
  activeRangeBtnText: { color: Colors.white },
  noDataChart: { alignItems: 'center', padding: Spacing.xl },
  noDataText: { color: Colors.textSecondary, fontSize: 14, marginTop: Spacing.sm, fontWeight: '600' },
  noDataSubText: { color: Colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  modalContent: { padding: Spacing.md },
  modalTitle: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.xs },
  modalSubtitle: { color: Colors.textSecondary, marginBottom: Spacing.md },
  inputLabel: { color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.cardSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 16,
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
