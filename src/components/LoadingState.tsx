import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRotatingMessage } from '../hooks/useRotatingMessage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Props = {
  message?: string;
  /** When set, cycles through messages while loading */
  messages?: readonly string[];
  active?: boolean;
};

export function LoadingState({
  message = 'Carregando...',
  messages,
  active = true,
}: Props) {
  const rotating = useRotatingMessage(messages ?? [message], active && !!messages?.length);
  const display = messages?.length ? rotating : message;

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.forest} size="large" />
      <Text style={[typography.caption, styles.message]}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  message: {
    textAlign: 'center',
  },
});
