import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import type { GoalChangeDecision } from '../domain/nutrition-targets';
import type { ProfileGoal } from '../features/profile';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';
import { typography } from '../theme/typography';

const GOAL_LABEL: Record<ProfileGoal, string> = {
  lose: 'Emagrecimento',
  maintain: 'Manutenção',
  gain: 'Hipertrofia',
};

type Props = {
  visible: boolean;
  nextGoal: ProfileGoal | null;
  busy?: boolean;
  onDecision: (decision: GoalChangeDecision) => void;
};

/**
 * Confirmação cross-platform (web + native) para mudança de objetivo na Dieta.
 * Substitui Alert.alert de 3 botões, inconsistente no React Native Web.
 */
export function GoalChangeConfirmModal({ visible, nextGoal, busy = false, onDecision }: Props) {
  const goalLabel = nextGoal ? GOAL_LABEL[nextGoal] : '';

  function choose(decision: GoalChangeDecision) {
    if (busy) return;
    onDecision(decision);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => choose('cancel')}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => choose('cancel')}
        accessibilityLabel="Fechar confirmação de objetivo"
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.title} accessibilityRole="header">
            Alterar objetivo
          </Text>
          <Text style={styles.body}>
            {goalLabel
              ? `Você escolheu ${goalLabel}. Como deseja tratar suas metas nutricionais atuais?`
              : 'Como deseja tratar suas metas nutricionais atuais?'}
          </Text>

          <View style={styles.actions}>
            <Button
              label="Manter minhas metas atuais"
              onPress={() => choose('keep_targets')}
              variant="outline"
              disabled={busy}
            />
            <Button
              label="Aplicar padrões"
              onPress={() => choose('apply_defaults')}
              disabled={busy}
            />
            <Button
              label="Cancelar"
              onPress={() => choose('cancel')}
              variant="outline"
              disabled={busy}
            />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 67, 50, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: colors.forest,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
