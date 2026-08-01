import type { MacroGoals } from '../../types';
import type {
  DayTargetsState,
  DayTypeTemplate,
  WeeklyScheduleEntry,
  Weekday,
} from './types';
import { cloneMacroGoals } from './types';

/**
 * Configuração pessoal inicial (não é default global do app).
 * Função pura — NÃO executar automaticamente no Sprint 2A.
 *
 * `restGoals` opcional: se omitido, o template `rest` não é incluído
 * (evita meta arbitrária de descanso sem decisão do usuário).
 */
export type CreatePersonalDayTargetSeedOptions = {
  restGoals?: MacroGoals;
};

const WORK_LONG_BIKE_GOALS: MacroGoals = {
  calories: 3350,
  protein: 160,
  carbs: 475,
  fat: 90,
};

const STRENGTH_GOALS: MacroGoals = {
  calories: 3150,
  protein: 160,
  carbs: 448,
  fat: 80,
};

const WORK_SHORT_BIKE_GOALS: MacroGoals = {
  calories: 3150,
  protein: 160,
  carbs: 448,
  fat: 80,
};

function buildTemplate(
  id: string,
  code: DayTypeTemplate['code'],
  label: string,
  dailyGoals: MacroGoals,
  description?: string,
): DayTypeTemplate {
  return {
    id,
    code,
    label,
    description,
    dailyGoals: cloneMacroGoals(dailyGoals),
    isActive: true,
  };
}

/**
 * Retorna novos objetos a cada chamada (sem referências compartilhadas).
 * IDs estáveis apenas para facilitar testes; não implica seed automático.
 */
export function createPersonalDayTargetSeed(
  options: CreatePersonalDayTargetSeedOptions = {},
): DayTargetsState {
  const templates: DayTypeTemplate[] = [
    buildTemplate(
      'personal-tpl-work_long_bike',
      'work_long_bike',
      'Trabalho longo + bicicleta',
      WORK_LONG_BIKE_GOALS,
    ),
    buildTemplate(
      'personal-tpl-strength_training',
      'strength_training',
      'Musculação intensa',
      STRENGTH_GOALS,
    ),
    buildTemplate(
      'personal-tpl-work_short_bike',
      'work_short_bike',
      'Trabalho reduzido + bicicleta',
      WORK_SHORT_BIKE_GOALS,
    ),
  ];

  if (options.restGoals) {
    templates.push(
      buildTemplate(
        'personal-tpl-rest',
        'rest',
        'Descanso',
        options.restGoals,
      ),
    );
  }

  const longId = 'personal-tpl-work_long_bike';
  const strengthId = 'personal-tpl-strength_training';
  const shortId = 'personal-tpl-work_short_bike';

  const entries: WeeklyScheduleEntry[] = (
    [
      [0, longId], // segunda
      [1, strengthId], // terça
      [2, strengthId], // quarta
      [3, longId], // quinta
      [4, longId], // sexta
      [5, longId], // sábado
      [6, shortId], // domingo
    ] as const
  ).map(([weekday, templateId]) => ({
    weekday: weekday as Weekday,
    templateId,
  }));

  return {
    dayTypeTemplates: templates,
    weeklySchedule: { entries },
    dailyTargetOverrides: [],
  };
}
