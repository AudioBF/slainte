import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type { DayTypeCode, DayTypeTemplate } from '../../../domain/day-targets';
import { Button } from '../../../components/Button';
import { InputField } from '../../../components/InputField';
import { colors } from '../../../theme/colors';
import { radius, spacing, touch } from '../../../theme/tokens';
import {
  DAY_TYPE_CODE_OPTIONS,
  buildTemplateFromDraft,
  canDeactivateTemplate,
  draftConsistency,
  emptyTemplateDraft,
  recalculateDraftCarbs,
  templateToDraft,
  type TemplateDraft,
} from '../scheduleLogic';
import type { WeeklySchedule } from '../../../domain/day-targets';

type Props = {
  visible: boolean;
  initial?: DayTypeTemplate | null;
  schedule: WeeklySchedule;
  onSave: (template: DayTypeTemplate) => void;
  onClose: () => void;
};

export function DayTypeTemplateFormModal({
  visible,
  initial,
  schedule,
  onSave,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<TemplateDraft>(emptyTemplateDraft());
  const [error, setError] = useState<string | null>(null);
  const [deactivateHint, setDeactivateHint] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraft(initial ? templateToDraft(initial) : emptyTemplateDraft());
    setError(null);
    setDeactivateHint(null);
  }, [visible, initial]);

  const consistency = draftConsistency(draft);
  const carbsHint = (() => {
    const next = recalculateDraftCarbs(draft);
    return next.carbs !== draft.carbs ? next.carbs : null;
  })();

  function patch(partial: Partial<TemplateDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setError(null);
    setDeactivateHint(null);
  }

  function handleActiveChange(next: boolean) {
    if (!next && draft.id) {
      const gate = canDeactivateTemplate(schedule, draft.id);
      if (!gate.ok) {
        // Inline hint avoids stacking a second Modal over this form (RN Web pointer traps).
        setDeactivateHint(
          `Este tipo ainda está associado a: ${gate.labels.join(', ')}. Altere esses dias na agenda antes de desativar.`,
        );
        return;
      }
    }
    patch({ isActive: next });
  }

  function handleSave() {
    const result = buildTemplateFromDraft(draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSave(result.template);
  }

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar formulário"
        />
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {initial ? 'Editar tipo de dia' : 'Novo tipo de dia'}
          </Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <InputField
              label="Nome"
              value={draft.label}
              onChangeText={(label) => patch({ label })}
              placeholder="Ex.: Treino pesado"
              accessibilityLabel="Nome do tipo de dia"
            />

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.codeList}>
              {DAY_TYPE_CODE_OPTIONS.map((option) => {
                const selected = draft.code === option.code;
                return (
                  <Pressable
                    key={option.code}
                    style={[styles.codeChip, selected && styles.codeChipSelected]}
                    onPress={() => patch({ code: option.code as DayTypeCode })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={option.label}
                  >
                    <Text
                      style={[styles.codeChipText, selected && styles.codeChipTextSelected]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <InputField
              label="Descrição (opcional)"
              value={draft.description}
              onChangeText={(description) => patch({ description })}
              placeholder="Rotina, horário, notas…"
              multiline
            />

            <View style={styles.macroGrid}>
              {(
                [
                  ['calories', 'Calorias', 'kcal'],
                  ['protein', 'Proteína', 'g'],
                  ['carbs', 'Carboidratos', 'g'],
                  ['fat', 'Gordura', 'g'],
                ] as const
              ).map(([key, label, unit]) => (
                <View key={key} style={styles.macroBlock}>
                  <InputField
                    label={`${label} (${unit})`}
                    value={draft[key]}
                    onChangeText={(value) => patch({ [key]: value })}
                    keyboardType="numeric"
                    accessibilityLabel={label}
                  />
                </View>
              ))}
            </View>

            {!consistency.isConsistent && consistency.status !== 'invalid_input' ? (
              <View style={styles.banner}>
                <Text style={styles.bannerTitle}>Metas inconsistentes</Text>
                <Text style={styles.bannerBody}>
                  Soma dos macros: {consistency.calculatedCalories} kcal · diferença{' '}
                  {consistency.differenceKcal > 0 ? '+' : ''}
                  {consistency.differenceKcal} kcal (tolerância ±{consistency.toleranceKcal}).
                </Text>
                {carbsHint ? (
                  <Pressable
                    onPress={() => patch(recalculateDraftCarbs(draft))}
                    accessibilityRole="button"
                    accessibilityLabel="Recalcular carboidratos"
                  >
                    <Text style={styles.link}>Recalcular carboidratos ({carbsHint} g)</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Ativo</Text>
              <Switch
                value={draft.isActive}
                onValueChange={handleActiveChange}
                accessibilityLabel="Template ativo"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {deactivateHint ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {deactivateHint}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button label="Cancelar" variant="outline" onPress={onClose} />
            <Button label="Salvar tipo" onPress={handleSave} />
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
    padding: spacing.md,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '92%',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: spacing.md,
    zIndex: 1,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: colors.forest,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  label: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  codeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  codeChip: {
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  codeChipSelected: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  codeChipText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.text,
  },
  codeChipTextSelected: {
    color: colors.white,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  macroBlock: {
    width: '48%',
    flexGrow: 1,
  },
  banner: {
    marginTop: spacing.md,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bannerTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.forest,
  },
  bannerBody: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.text,
  },
  link: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.orange,
    marginTop: spacing.xs,
  },
  switchRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
  },
  switchLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.text,
  },
  error: {
    marginTop: spacing.md,
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.orange,
  },
  footer: {
    gap: spacing.sm,
  },
});
