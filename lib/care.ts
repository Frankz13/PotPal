export const DEFAULT_CARE_INTERVALS = {
  watering: 7,
  check: 7,
  fertilize: 30,
} as const;

export type CareTaskKey = keyof typeof DEFAULT_CARE_INTERVALS;

export type CareTask = {
  intervalDays: number;
  lastDoneISO: string | null;
};

export type UnitCare = Record<CareTaskKey, CareTask>;

export function createDefaultCare(): UnitCare {
  return {
    watering: { intervalDays: DEFAULT_CARE_INTERVALS.watering, lastDoneISO: null },
    check: { intervalDays: DEFAULT_CARE_INTERVALS.check, lastDoneISO: null },
    fertilize: { intervalDays: DEFAULT_CARE_INTERVALS.fertilize, lastDoneISO: null },
  };
}

export function normalizeCare(care?: Partial<Record<CareTaskKey, Partial<CareTask>>>): UnitCare {
  const defaults = createDefaultCare();

  return {
    watering: {
      intervalDays: normalizeInterval(care?.watering?.intervalDays, defaults.watering.intervalDays),
      lastDoneISO: normalizeLastDone(care?.watering?.lastDoneISO),
    },
    check: {
      intervalDays: normalizeInterval(care?.check?.intervalDays, defaults.check.intervalDays),
      lastDoneISO: normalizeLastDone(care?.check?.lastDoneISO),
    },
    fertilize: {
      intervalDays: normalizeInterval(care?.fertilize?.intervalDays, defaults.fertilize.intervalDays),
      lastDoneISO: normalizeLastDone(care?.fertilize?.lastDoneISO),
    },
  };
}

function normalizeInterval(interval: number | undefined, fallback: number): number {
  if (!interval || interval < 1) {
    return fallback;
  }

  return Math.round(interval);
}

function normalizeLastDone(lastDoneISO: string | null | undefined): string | null {
  if (!lastDoneISO) {
    return null;
  }

  return Number.isNaN(Date.parse(lastDoneISO)) ? null : lastDoneISO;
}

export function getDueDate(lastDoneISO: string | null, intervalDays: number): Date {
  if (!lastDoneISO) {
    return new Date(0);
  }

  const dueDate = new Date(lastDoneISO);
  dueDate.setDate(dueDate.getDate() + intervalDays);
  return dueDate;
}

export function getTaskStatus(lastDoneISO: string | null, intervalDays: number): 'overdue' | 'today' | 'upcoming' {
  if (!lastDoneISO) {
    return 'overdue';
  }

  const dueDate = getDueDate(lastDoneISO, intervalDays);
  const now = new Date();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  if (dueStart < nowStart) {
    return 'overdue';
  }

  if (dueStart.getTime() === nowStart.getTime()) {
    return 'today';
  }

  return 'upcoming';
}

export const CARE_TASK_LABELS: Record<CareTaskKey, string> = {
  watering: 'Water',
  check: 'Check',
  fertilize: 'Fertilize',
};

export function getDueTaskKeys(care: UnitCare): CareTaskKey[] {
  return (Object.keys(care) as CareTaskKey[]).filter((taskKey) => {
    const task = care[taskKey];
    return getTaskStatus(task.lastDoneISO, task.intervalDays) !== 'upcoming';
  });
}

export function completeCareTasks(care: UnitCare, taskKeys: CareTaskKey[], completedAtISO: string): UnitCare {
  if (taskKeys.length === 0) {
    return care;
  }

  return (Object.keys(care) as CareTaskKey[]).reduce<UnitCare>((nextCare, taskKey) => {
    const task = care[taskKey];
    nextCare[taskKey] = taskKeys.includes(taskKey) ? { ...task, lastDoneISO: completedAtISO } : task;
    return nextCare;
  }, {} as UnitCare);
}

export function getUnitUrgencyCounts(care: UnitCare): { overdueCount: number; dueTodayCount: number } {
  let overdueCount = 0;
  let dueTodayCount = 0;

  for (const taskKey of Object.keys(care) as CareTaskKey[]) {
    const task = care[taskKey];
    const status = getTaskStatus(task.lastDoneISO, task.intervalDays);
    if (status === 'overdue') {
      overdueCount += 1;
    }
    if (status === 'today') {
      dueTodayCount += 1;
    }
  }

  return { overdueCount, dueTodayCount };
}


export function compareCareUrgency(
  a: { name: string; care: UnitCare },
  b: { name: string; care: UnitCare },
): number {
  const aUrgency = getUnitUrgencyCounts(a.care);
  const bUrgency = getUnitUrgencyCounts(b.care);

  if (aUrgency.overdueCount !== bUrgency.overdueCount) {
    return bUrgency.overdueCount - aUrgency.overdueCount;
  }

  if (aUrgency.dueTodayCount !== bUrgency.dueTodayCount) {
    return bUrgency.dueTodayCount - aUrgency.dueTodayCount;
  }

  return a.name.localeCompare(b.name);
}
