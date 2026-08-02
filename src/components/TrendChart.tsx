import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type Props = {
  data: number[];
  /** Meta escalar (legado) ou uma meta por dia (flag ON). */
  goal: number | number[];
};

function normalizeGoals(goal: number | number[], length: number): number[] {
  if (typeof goal === 'number') {
    return Array.from({ length }, () => goal);
  }
  if (goal.length === length) return goal;
  const fallback = goal[0] ?? 0;
  return Array.from({ length }, (_, i) => goal[i] ?? fallback);
}

export function TrendChart({ data, goal }: Props) {
  const width = 320;
  const height = 140;
  const padding = { top: 10, right: 8, bottom: 24, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const goals = normalizeGoals(goal, data.length);
  const maxVal = Math.max(...data, ...goals, 1);
  const minVal = 0;
  const span = Math.max(maxVal - minVal, 1);
  const scalarGoal = typeof goal === 'number';
  const goalsVary = !scalarGoal && goals.some((g) => g !== goals[0]);

  const points = data
    .map((v, i) => {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = padding.top + chartH - ((v - minVal) / span) * chartH;
      return `${x},${y}`;
    })
    .join(' ');

  const goalY =
    scalarGoal || !goalsVary
      ? padding.top + chartH - ((goals[0] - minVal) / span) * chartH
      : null;

  return (
    <View>
      <Text style={[typography.subtitle, styles.title]}>Calorias da semana</Text>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {goalY != null ? (
          <Line
            x1={padding.left}
            y1={goalY}
            x2={width - padding.right}
            y2={goalY}
            stroke={colors.orange}
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        ) : null}
        {data.map((v, i) => {
          const barW = chartW / data.length - 6;
          const x = padding.left + i * (chartW / data.length) + 3;
          const barH = ((v - minVal) / span) * chartH;
          const dayGoalY = padding.top + chartH - ((goals[i] - minVal) / span) * chartH;
          return (
            <Fragment key={i}>
              <Rect
                x={x}
                y={padding.top + chartH - barH}
                width={barW}
                height={barH}
                rx={4}
                fill={colors.sage}
                opacity={0.35}
              />
              {goalY == null ? (
                <Line
                  x1={x}
                  y1={dayGoalY}
                  x2={x + barW}
                  y2={dayGoalY}
                  stroke={colors.orange}
                  strokeDasharray="3 2"
                  strokeWidth={1.5}
                />
              ) : null}
            </Fragment>
          );
        })}
        <Polyline points={points} fill="none" stroke={colors.forest} strokeWidth={2.5} />
        {DAYS.map((day, i) => (
          <SvgText
            key={day}
            x={padding.left + i * (chartW / Math.max(DAYS.length - 1, 1))}
            y={height - 4}
            fontSize={10}
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {day}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.goalNote}>
        {goalsVary
          ? 'Marcadores tracejados = meta de cada dia'
          : `Linha tracejada = meta diária (${goals[0]} kcal)`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
  },
  goalNote: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
