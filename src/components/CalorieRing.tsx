import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  current: number;
  goal: number;
  size?: number;
};

export function CalorieRing({ current, goal, size = 160 }: Props) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const targetProgress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: targetProgress,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [anim, targetProgress]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={`${Math.round(current)} de ${goal} calorias consumidas`}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <G transform={`rotate(-90 ${center} ${center})`}>
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.forest}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.value}>{Math.round(current)}</Text>
        <Text style={styles.label}>de {goal} kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  value: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: colors.forest,
  },
  label: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});
