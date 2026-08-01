import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { colors } from '../../../theme/colors';
import { radius, spacing } from '../../../theme/tokens';

type Action = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'secondary';
};

type Props = {
  visible: boolean;
  title: string;
  body: string;
  busy?: boolean;
  actions: Action[];
  onCancel: () => void;
};

/** Modal de confirmação cross-platform (web + native). */
export function ConfirmSheet({
  visible,
  title,
  body,
  busy = false,
  actions,
  onCancel,
}: Props) {
  // Unmount when hidden so web a11y tree does not keep stale Cancel/action buttons.
  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Fechar confirmação"
        />
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            {actions.map((action) => (
              <Button
                key={action.label}
                label={action.label}
                onPress={action.onPress}
                variant={action.variant ?? 'primary'}
                disabled={busy}
              />
            ))}
          </View>
        </View>
      </View>
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
    zIndex: 1,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: colors.forest,
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
