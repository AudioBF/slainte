import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type Props = {
  data: number[];
  goal: number;
};

export function TrendChart({ data, goal }: Props) {
  const width = 320;
  const height = 140;
  const padding = { top: 10, right: 8, bottom: 24, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data, goal, 1);
  const minVal = 0;
  const span = Math.max(maxVal - minVal, 1);

  const points = data
    .map((v, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartW;
      const y = padding.top + chartH - ((v - minVal) / span) * chartH;
      return `${x},${y}`;
    })
    .join(' ');

  const goalY = padding.top + chartH - ((goal - minVal) / span) * chartH;

  return (
    <View>
      <Text style={[typography.subtitle, styles.title]}>Calorias da semana</Text>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line
          x1={padding.left}
          y1={goalY}
          x2={width - padding.right}
          y2={goalY}
          stroke={colors.orange}
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        {data.map((v, i) => {
          const barW = chartW / data.length - 6;
          const x = padding.left + i * (chartW / data.length) + 3;
          const barH = ((v - minVal) / span) * chartH;
          return (
            <Rect
              key={i}
              x={x}
              y={padding.top + chartH - barH}
              width={barW}
              height={barH}
              rx={4}
              fill={colors.sage}
              opacity={0.35}
            />
          );
        })}
        <Polyline points={points} fill="none" stroke={colors.forest} strokeWidth={2.5} />
        {DAYS.map((day, i) => (
          <SvgText
            key={day}
            x={padding.left + i * (chartW / (DAYS.length - 1))}
            y={height - 4}
            fontSize={10}
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {day}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.goalNote}>Linha tracejada = meta diária ({goal} kcal)</Text>
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
