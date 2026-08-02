import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DayTypeTemplate, Weekday } from '../src/domain/day-targets';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Section } from '../src/components/Section';
import { ConfirmSheet } from '../src/features/schedule/components/ConfirmSheet';
import { DayTypeTemplateCard } from '../src/features/schedule/components/DayTypeTemplateCard';
import { DayTypeTemplateFormModal } from '../src/features/schedule/components/DayTypeTemplateFormModal';
import { DeviceLocalNotice } from '../src/features/schedule/components/DeviceLocalNotice';
import { TemplatePickerModal } from '../src/features/schedule/components/TemplatePickerModal';
import { WeeklyScheduleEditor } from '../src/features/schedule/components/WeeklyScheduleEditor';
import {
  applyPersonalSeedState,
  cloneWeeklySchedule,
  hasExistingDayTargetsConfig,
  personalSeedSummaryLines,
  planRemoveDayTypeTemplate,
  scheduleWithoutTemplate,
  schedulesEqual,
  setScheduleEntryDraft,
  weekdayLabel,
  nextDraftAfterStoreScheduleChange,
} from '../src/features/schedule/scheduleLogic';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/tokens';
import { typography } from '../src/theme/typography';

type ConfirmState =
  | null
  | { kind: 'remove_unused'; templateId: string; label: string }
  | { kind: 'remove_in_use'; templateId: string; label: string; days: string }
  | { kind: 'seed'; overwrite: boolean };

export default function ScheduleScreen() {
  const router = useRouter();
  const templates = useAppStore((s) => s.dayTypeTemplates);
  const weeklySchedule = useAppStore((s) => s.weeklySchedule);
  const upsertDayTypeTemplate = useAppStore((s) => s.upsertDayTypeTemplate);
  const removeDayTypeTemplate = useAppStore((s) => s.removeDayTypeTemplate);
  const setDayTypeTemplates = useAppStore((s) => s.setDayTypeTemplates);
  const setWeeklySchedule = useAppStore((s) => s.setWeeklySchedule);
  const setDailyTargetOverrides = useAppStore((s) => s.setDailyTargetOverrides);

  const [draftSchedule, setDraftSchedule] = useState(() =>
    cloneWeeklySchedule(weeklySchedule),
  );
  const storeScheduleBaselineRef = useRef(weeklySchedule);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pickerWeekday, setPickerWeekday] = useState<Weekday | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DayTypeTemplate | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  // Sync draft from store only when the draft was still aligned with the previous
  // store snapshot. Preserves unsaved agenda edits across template removal / hydrate.
  useEffect(() => {
    const previousStore = storeScheduleBaselineRef.current;
    storeScheduleBaselineRef.current = weeklySchedule;
    setDraftSchedule((draft) =>
      nextDraftAfterStoreScheduleChange(draft, previousStore, weeklySchedule),
    );
  }, [weeklySchedule]);

  const dirty = useMemo(
    () => !schedulesEqual(draftSchedule, weeklySchedule),
    [draftSchedule, weeklySchedule],
  );

  const isEmpty = templates.length === 0;

  function handleBack() {
    // Preferir voltar ao Perfil (origem); fallback estável se não houver histórico.
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/profile');
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(template: DayTypeTemplate) {
    setEditing(template);
    setFormOpen(true);
  }

  function handleSaveTemplate(template: DayTypeTemplate) {
    upsertDayTypeTemplate(template);
    setFormOpen(false);
    setEditing(null);
  }

  function requestRemove(template: DayTypeTemplate) {
    const plan = planRemoveDayTypeTemplate(templates, draftSchedule, template.id);
    if (plan.kind === 'unused') {
      setConfirm({
        kind: 'remove_unused',
        templateId: template.id,
        label: template.label,
      });
      return;
    }
    if (plan.kind === 'in_use') {
      setConfirm({
        kind: 'remove_in_use',
        templateId: template.id,
        label: template.label,
        days: plan.labels.join(', '),
      });
    }
  }

  function confirmRemove() {
    if (!confirm || (confirm.kind !== 'remove_unused' && confirm.kind !== 'remove_in_use')) {
      return;
    }
    const { templateId } = confirm;
    // Always prune draft associations so in-use removal cannot leave broken refs,
    // even when the agenda draft has other unsaved weekday edits.
    setDraftSchedule((prev) => scheduleWithoutTemplate(prev, templateId));
    removeDayTypeTemplate(templateId);
    setConfirm(null);
  }

  function handleSaveAgenda() {
    setWeeklySchedule(cloneWeeklySchedule(draftSchedule));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  }

  function requestSeed() {
    setConfirm({
      kind: 'seed',
      overwrite: hasExistingDayTargetsConfig({
        dayTypeTemplates: templates,
        weeklySchedule: draftSchedule,
      }),
    });
  }

  function applySeed() {
    const seed = applyPersonalSeedState();
    setDayTypeTemplates(seed.dayTypeTemplates);
    setWeeklySchedule(seed.weeklySchedule);
    setDailyTargetOverrides(seed.dailyTargetOverrides);
    setDraftSchedule(cloneWeeklySchedule(seed.weeklySchedule));
    setConfirm(null);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  }

  const seedBody = [
    confirm?.kind === 'seed' && confirm.overwrite
      ? 'Isso substitui os tipos de dia e a agenda atuais.'
      : 'Aplicar a configuração pessoal inicial:',
    ...personalSeedSummaryLines().map(
      (line) => `• ${line.weekdaysLabel}: ${line.templateLabel} — ${line.calories.toLocaleString('pt-BR')} kcal`,
    ),
    'Não inclui meta de descanso automática.',
  ].join('\n');

  const pickerSelectedId =
    pickerWeekday == null
      ? null
      : draftSchedule.entries.find((e) => e.weekday === pickerWeekday)?.templateId ?? null;

  return (
    <Screen footerSpace={dirty ? 72 : 0}>
      <ScreenHeader
        title="Agenda semanal"
        subtitle="Metas diferentes para cada tipo de rotina"
      />

      <DeviceLocalNotice />

      {isEmpty ? (
        <View style={styles.empty} accessibilityLabel="Nenhum tipo de dia configurado">
          <Text style={typography.subtitle}>Comece pelos tipos de dia</Text>
          <Text style={[typography.body, styles.emptyBody]}>
            Crie tipos de dia com metas próprias ou use sua rotina atual como ponto de partida.
          </Text>
          <Button label="Criar primeiro tipo de dia" onPress={openCreate} />
          <Button
            label="Usar minha rotina atual"
            variant="outline"
            onPress={requestSeed}
            style={styles.secondaryBtn}
          />
        </View>
      ) : null}

      <Section title="Agenda da semana" subtitle="Associe um tipo de dia a cada weekday">
        <WeeklyScheduleEditor
          schedule={draftSchedule}
          templates={templates}
          onSelectWeekday={setPickerWeekday}
        />
        <Button
          label={savedFlash && !dirty ? 'Agenda salva ✓' : 'Salvar agenda'}
          onPress={handleSaveAgenda}
          disabled={!dirty && !savedFlash}
          style={styles.saveAgenda}
        />
        {dirty ? (
          <Text style={styles.dirtyHint}>Há alterações não salvas na agenda.</Text>
        ) : null}
      </Section>

      <Section title="Tipos de dia" subtitle="Templates com metas Atwater-coerentes">
        {templates.map((template) => (
          <DayTypeTemplateCard
            key={template.id}
            template={template}
            onEdit={() => openEdit(template)}
            onRemove={() => requestRemove(template)}
          />
        ))}
        <Button label="Novo tipo de dia" variant="outline" onPress={openCreate} />
        <Button
          label="Usar minha rotina atual"
          variant="outline"
          onPress={requestSeed}
          style={styles.secondaryBtn}
        />
      </Section>

      <Button label="Voltar" variant="outline" onPress={handleBack} style={styles.back} />

      <TemplatePickerModal
        visible={pickerWeekday != null}
        weekdayLabel={pickerWeekday != null ? weekdayLabel(pickerWeekday) : ''}
        templates={templates}
        selectedTemplateId={pickerSelectedId}
        onClose={() => setPickerWeekday(null)}
        onSelectProfileDefault={() => {
          if (pickerWeekday == null) return;
          setDraftSchedule((prev) => setScheduleEntryDraft(prev, pickerWeekday, null));
          setPickerWeekday(null);
        }}
        onSelectTemplate={(templateId) => {
          if (pickerWeekday == null) return;
          setDraftSchedule((prev) => setScheduleEntryDraft(prev, pickerWeekday, templateId));
          setPickerWeekday(null);
        }}
      />

      <DayTypeTemplateFormModal
        visible={formOpen}
        initial={editing}
        schedule={draftSchedule}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={handleSaveTemplate}
      />

      <ConfirmSheet
        visible={confirm?.kind === 'remove_unused'}
        title="Remover tipo de dia?"
        body={
          confirm?.kind === 'remove_unused'
            ? `Remover “${confirm.label}”? Esta ação não pode ser desfeita.`
            : ''
        }
        onCancel={() => setConfirm(null)}
        actions={[
          {
            label: 'Remover',
            onPress: () => confirmRemove(),
          },
          { label: 'Cancelar', onPress: () => setConfirm(null), variant: 'outline' },
        ]}
      />

      <ConfirmSheet
        visible={confirm?.kind === 'remove_in_use'}
        title="Tipo em uso na agenda"
        body={
          confirm?.kind === 'remove_in_use'
            ? `“${confirm.label}” está associado a: ${confirm.days}. Remover o tipo e fazer esses dias usarem a meta padrão do perfil?`
            : ''
        }
        onCancel={() => setConfirm(null)}
        actions={[
          {
            label: 'Remover e usar meta padrão',
            onPress: () => confirmRemove(),
          },
          { label: 'Cancelar', onPress: () => setConfirm(null), variant: 'outline' },
        ]}
      />

      <ConfirmSheet
        visible={confirm?.kind === 'seed'}
        title="Usar minha rotina atual"
        body={seedBody}
        onCancel={() => setConfirm(null)}
        actions={[
          { label: 'Aplicar configuração', onPress: applySeed },
          { label: 'Cancelar', onPress: () => setConfirm(null), variant: 'outline' },
        ]}
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyBody: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  secondaryBtn: {
    marginTop: spacing.sm,
  },
  saveAgenda: {
    marginTop: spacing.md,
  },
  dirtyHint: {
    marginTop: spacing.sm,
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.orange,
  },
  back: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
