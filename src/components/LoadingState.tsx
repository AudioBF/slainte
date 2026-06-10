import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Props = {
  message?: string;
};

export function LoadingState({ message = 'Carregando...' }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.forest} size="large" />
      <Text style={[typography.caption, styles.message]}>{message}</Text>
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
