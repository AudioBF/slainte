import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { radius, spacing } from '../../../theme/tokens';

type Props = {
  showActivationNote?: boolean;
};

export function DeviceLocalNotice({ showActivationNote = true }: Props) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="text"
      accessibilityLabel="Esta configuração está salva apenas neste dispositivo"
    >
      <Text style={styles.title}>Esta configuração está salva apenas neste dispositivo.</Text>
      <Text style={styles.body}>
        A sincronização entre dispositivos será adicionada posteriormente.
      </Text>
      {showActivationNote ? (
        <Text style={styles.body}>
          Suas configurações serão usadas nas telas principais quando as metas por tipo de dia forem
          ativadas.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.forest,
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
