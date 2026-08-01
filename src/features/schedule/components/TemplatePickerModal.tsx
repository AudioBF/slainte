import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DayTypeTemplate } from '../../../domain/day-targets';
import { colors } from '../../../theme/colors';
import { radius, spacing, touch } from '../../../theme/tokens';
import { activeTemplatesOnly } from '../scheduleLogic';

type Props = {
  visible: boolean;
  weekdayLabel: string;
  templates: DayTypeTemplate[];
  selectedTemplateId: string | null;
  onSelectProfileDefault: () => void;
  onSelectTemplate: (templateId: string) => void;
  onClose: () => void;
};

export function TemplatePickerModal({
  visible,
  weekdayLabel,
  templates,
  selectedTemplateId,
  onSelectProfileDefault,
  onSelectTemplate,
  onClose,
}: Props) {
  const active = activeTemplatesOnly(templates);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar seletor"
        />
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {weekdayLabel}
          </Text>
          <Text style={styles.subtitle}>Escolha um tipo de dia ativo ou a meta padrão.</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            <Pressable
              style={[styles.option, selectedTemplateId == null && styles.optionSelected]}
              onPress={onSelectProfileDefault}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedTemplateId == null }}
              accessibilityLabel="Usar meta padrão do perfil"
            >
              <Text
                style={[
                  styles.optionText,
                  selectedTemplateId == null && styles.optionTextSelected,
                ]}
              >
                Usar meta padrão do perfil
              </Text>
              {selectedTemplateId == null ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>

            {active.map((template) => {
              const selected = selectedTemplateId === template.id;
              return (
                <Pressable
                  key={template.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => onSelectTemplate(template.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${template.label}, ${template.dailyGoals.calories} kcal`}
                >
                  <View style={styles.optionBody}>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {template.label}
                    </Text>
                    <Text style={styles.optionMeta}>{template.dailyGoals.calories} kcal</Text>
                  </View>
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}

            {active.length === 0 ? (
              <Text style={styles.empty}>Nenhum tipo ativo. Crie ou ative um template.</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 67, 50, 0.45)',
    justifyContent: 'flex-end',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '70%',
    gap: spacing.sm,
    zIndex: 1,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: colors.forest,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  list: {
    maxHeight: 360,
  },
  option: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  optionSelected: {
    backgroundColor: colors.cream,
  },
  optionBody: {
    flex: 1,
    gap: 2,
  },
  optionText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.forest,
  },
  optionMeta: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  check: {
    color: colors.orange,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  empty: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    padding: spacing.md,
  },
});
