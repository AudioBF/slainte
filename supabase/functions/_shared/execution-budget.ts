/** Global wall-clock budget for meal-plan Edge invocations (below Supabase ~150s idle limit). */
export const MEAL_PLAN_GLOBAL_BUDGET_MS = 135_000;

/** Do not start a new Gemini call when less than this remains. */
export const MIN_BUDGET_TO_START_CALL_MS = 20_000;

/** Minimum remaining budget to attempt a variety-validation retry. */
export const MIN_BUDGET_FOR_VARIETY_RETRY_MS = 45_000;

/** Minimum remaining budget to attempt one Gemini unavailable retry (meal plan). */
export const MIN_BUDGET_FOR_UNAVAILABLE_RETRY_MS = 60_000;

export class ExecutionBudgetExceededError extends Error {
  constructor(message = 'EXECUTION_BUDGET_EXCEEDED') {
    super(message);
    this.name = 'ExecutionBudgetExceededError';
  }
}

export class ExecutionBudget {
  readonly requestId: string;
  readonly startedAt: number;
  readonly totalMs: number;

  constructor(requestId: string, totalMs = MEAL_PLAN_GLOBAL_BUDGET_MS) {
    this.requestId = requestId;
    this.startedAt = Date.now();
    this.totalMs = totalMs;
  }

  elapsedMs(): number {
    return Date.now() - this.startedAt;
  }

  remainingMs(): number {
    return Math.max(0, this.totalMs - this.elapsedMs());
  }

  canStartCall(minRequiredMs = MIN_BUDGET_TO_START_CALL_MS): boolean {
    return this.remainingMs() >= minRequiredMs;
  }

  /** Cap per-call timeout to remaining budget (reserve ms for JSON response). */
  callTimeoutMs(defaultMs: number, responseReserveMs = 2_000): number {
    const capped = this.remainingMs() - responseReserveMs;
    return Math.max(1_000, Math.min(defaultMs, capped));
  }

  assertCanStartCall(minRequiredMs = MIN_BUDGET_TO_START_CALL_MS): void {
    if (!this.canStartCall(minRequiredMs)) {
      throw new ExecutionBudgetExceededError();
    }
  }
}

export type MealPlanBudgetLog = {
  requestId: string;
  attempt: number;
  geminiAttempt?: number;
  model?: string;
  elapsedMs: number;
  remainingBudgetMs: number;
  code?: string;
  event:
    | 'gemini_start'
    | 'gemini_end'
    | 'variety_skip'
    | 'budget_exceeded'
    | 'success'
    | 'error'
    | 'retry_scheduled'
    | 'retry_skipped';
};

export function logMealPlanBudget(entry: MealPlanBudgetLog): void {
  console.log(JSON.stringify({ tag: 'meal-plan-budget', ...entry }));
}
