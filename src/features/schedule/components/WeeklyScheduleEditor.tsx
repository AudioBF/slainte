import { StyleSheet, View } from 'react-native';
import type { DayTypeTemplate, WeeklySchedule, Weekday } from '../../../domain/day-targets';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/tokens';
import { ALL_WEEKDAYS, resolveScheduleRow } from '../scheduleLogic';
import { WeeklyScheduleRow } from './WeeklyScheduleRow';

type Props = {
  schedule: WeeklySchedule;
  templates: DayTypeTemplate[];
  onSelectWeekday: (weekday: Weekday) => void;
};

export function WeeklyScheduleEditor({ schedule, templates, onSelectWeekday }: Props) {
  return (
    <View style={styles.card}>
      {ALL_WEEKDAYS.map((weekday) => {
        const row = resolveScheduleRow(weekday, schedule, templates);
        return (
          <WeeklyScheduleRow
            key={weekday}
            weekdayLabel={row.label}
            template={row.template}
            usingProfileDefault={row.usingProfileDefault}
            orphaned={row.orphaned}
            onPress={() => onSelectWeekday(weekday)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
