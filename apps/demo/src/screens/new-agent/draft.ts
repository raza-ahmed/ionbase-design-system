import type { AgentDraft } from '../../data/agents';

export const STEPS = ['Basics', 'Trigger', 'Guardrails', 'Review'] as const;

export const EMPTY_DRAFT: AgentDraft = {
  name: '',
  purpose: '',
  team: null,
  trigger: 'schedule',
  startDate: null,
  frequency: 'daily',
  runAt: '09:00',
  escalationPhone: '',
  knowledgeFiles: [],
  requireApproval: true,
  notifyOn: ['failed', 'approval'],
  monthlyTokenBudget: '250000',
};

export interface SavedDraft {
  values: AgentDraft;
  /** Index of the last step the server accepted, or -1. */
  completed: number;
  model: string | null;
}

const KEY = 'ionbase-ops:new-agent-draft';

/** The Wizard pattern's `partial` rule: each accepted step is saved as it lands. */
export function loadDraft(): SavedDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedDraft;
    // A draft saved before a field existed gets that field's default.
    return { ...saved, values: { ...EMPTY_DRAFT, ...saved.values } };
  } catch {
    return null;
  }
}

export function saveDraft(draft: SavedDraft) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage blocked: the wizard still works, it just can't resume.
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
