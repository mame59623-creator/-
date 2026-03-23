import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Circle, Ellipse, G, Rect } from 'react-native-svg';
import { Colors } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODEL_WIDTH = SCREEN_WIDTH * 0.55;
const MODEL_HEIGHT = MODEL_WIDTH * 2.2;

export interface MeasurementZone {
  key: string;
  label: string;
  x: number; // percentage of MODEL_WIDTH
  y: number; // percentage of MODEL_HEIGHT
}

const FRONT_ZONES: MeasurementZone[] = [
  { key: 'neck', label: 'Neck', x: 50, y: 8.5 },
  { key: 'shoulders', label: 'Shoulders', x: 50, y: 13 },
  { key: 'chest', label: 'Chest', x: 50, y: 18 },
  { key: 'leftUpperArm', label: 'L Arm', x: 22, y: 20 },
  { key: 'rightUpperArm', label: 'R Arm', x: 78, y: 20 },
  { key: 'leftForearm', label: 'L Forearm', x: 16, y: 28 },
  { key: 'rightForearm', label: 'R Forearm', x: 84, y: 28 },
  { key: 'waist', label: 'Waist', x: 50, y: 30 },
  { key: 'hips', label: 'Hips', x: 50, y: 37 },
  { key: 'leftThigh', label: 'L Thigh', x: 35, y: 50 },
  { key: 'rightThigh', label: 'R Thigh', x: 65, y: 50 },
  { key: 'leftCalf', label: 'L Calf', x: 33, y: 67 },
  { key: 'rightCalf', label: 'R Calf', x: 67, y: 67 },
];

interface BodyModelProps {
  measurements: { [key: string]: number | undefined };
  onZoneTap: (zone: MeasurementZone) => void;
  view: 'front' | 'back';
}

export function BodyModel({ measurements, onZoneTap, view }: BodyModelProps) {
  const zones = FRONT_ZONES;

  return (
    <View style={styles.container}>
      <View style={styles.svgContainer}>
        <Svg width={MODEL_WIDTH} height={MODEL_HEIGHT} viewBox="0 0 100 220">
          {/* Body silhouette */}
          {/* Head */}
          <Ellipse cx="50" cy="10" rx="9" ry="10" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />
          {/* Neck */}
          <Rect x="45" y="19" width="10" height="6" rx="2" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />
          {/* Torso */}
          <Path d="M25 25 Q20 35 20 50 Q20 62 25 68 L35 70 L35 80 L65 80 L65 70 L75 68 Q80 62 80 50 Q80 35 75 25 Z" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />
          {/* Left arm */}
          <Path d="M25 25 L15 30 L10 45 L14 60 L18 55 L20 40 L22 28 Z" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />
          {/* Right arm */}
          <Path d="M75 25 L85 30 L90 45 L86 60 L82 55 L80 40 L78 28 Z" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />
          {/* Left hand */}
          <Ellipse cx="13" cy="63" rx="5" ry="4" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />
          {/* Right hand */}
          <Ellipse cx="87" cy="63" rx="5" ry="4" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />
          {/* Left leg */}
          <Path d="M35 80 L30 110 L28 140 L33 165 L40 165 L42 140 L42 80 Z" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />
          {/* Right leg */}
          <Path d="M65 80 L70 110 L72 140 L67 165 L60 165 L58 140 L58 80 Z" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />
          {/* Left foot */}
          <Ellipse cx="33" cy="168" rx="7" ry="4" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />
          {/* Right foot */}
          <Ellipse cx="63" cy="168" rx="7" ry="4" fill={Colors.card} stroke={Colors.border} strokeWidth="1" />

          {/* Tap zones */}
          {zones.map(zone => {
            const value = measurements[zone.key];
            const hasValue = value !== undefined && value > 0;
            return (
              <G key={zone.key}>
                <Circle
                  cx={zone.x}
                  cy={(zone.y / 100) * 175}
                  r="7"
                  fill={hasValue ? Colors.primary + '40' : Colors.primary + '20'}
                  stroke={hasValue ? Colors.primary : Colors.border}
                  strokeWidth="1"
                  onPress={() => onZoneTap(zone)}
                />
                {hasValue && (
                  <Path d="" />
                )}
              </G>
            );
          })}
        </Svg>

        {/* Measurement labels overlay */}
        {zones.map(zone => {
          const value = measurements[zone.key];
          if (!value) return null;
          return (
            <View
              key={`label-${zone.key}`}
              style={[
                styles.measureLabel,
                {
                  left: (zone.x / 100) * MODEL_WIDTH + (zone.x > 50 ? 8 : -60),
                  top: (zone.y / 100) * MODEL_HEIGHT - 8,
                },
              ]}
            >
              <Text style={styles.measureLabelText}>{value}cm</Text>
            </View>
          );
        })}
      </View>

      {/* Tap hint */}
      <Text style={styles.hintText}>Tap circles to record measurements</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  svgContainer: {
    position: 'relative',
    width: MODEL_WIDTH,
    height: MODEL_HEIGHT,
  },
  measureLabel: {
    position: 'absolute',
    backgroundColor: Colors.primary + 'CC',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  measureLabelText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '600',
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
});
