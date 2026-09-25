import { nameTaken, type AgentDraft } from '../../data/agents';
import { today } from '../../lib/dates';

export type FieldErrors = Partial<Record<string, string>>;

/** One step's rules. Run on blur for a touched field, and for all of them on Next. */
export function validateStep(
  step: number,
  v: AgentDraft,
  model: string | null,
): FieldErrors {
  const e: FieldErrors = {};
  if (step === 0) {
    if (!v.name.trim()) e.name = 'Give the agent a name.';
    else if (v.name.trim().length > 60)
      e.name = 'Keep the name under 60 characters.';
    else if (nameTaken(v.name))
      e.name = `An agent called “${v.name.trim()}” already exists.`;
    if (v.purpose.trim().length < 20)
      e.purpose =
        'Describe the job in at least 20 characters — reviewers read this before approving a run.';
    if (!v.team) e.team = 'Choose the team that owns this agent.';
    if (!model) e.model = 'Choose a model.';
  }
  if (step === 1) {
    if (v.trigger === 'schedule') {
      if (!v.startDate) e.startDate = 'Choose when the schedule starts.';
      else if (v.startDate < today())
        e.startDate = 'The start date can’t be in the past.';
      if (v.frequency !== 'hourly' && !v.runAt)
        e.runAt = 'Choose the time it runs.';
    }
    const digits = v.escalationPhone.replace(/\D/g, '');
    if (digits && digits.length < 7)
      e.escalationPhone = 'Enter a full phone number, or leave it empty.';
  }
  if (step === 2) {
    const budget = Number(v.monthlyTokenBudget);
    if (!v.monthlyTokenBudget.trim() || Number.isNaN(budget))
      e.monthlyTokenBudget = 'Enter a monthly token budget as a number.';
    else if (budget < 1_000 || budget > 5_000_000)
      e.monthlyTokenBudget = 'Budgets run from 1,000 to 5,000,000 tokens.';
  }
  return e;
}

export const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  purpose: 'What it does',
  team: 'Owning team',
  model: 'Model',
  startDate: 'Start date',
  runAt: 'Runs at',
  escalationPhone: 'Escalation phone',
  monthlyTokenBudget: 'Monthly token budget',
};
