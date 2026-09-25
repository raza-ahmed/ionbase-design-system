import {
  Button,
  Checkbox,
  CheckboxGroup,
  Combobox,
  DatePicker,
  Divider,
  Fieldset,
  FileUpload,
  Input,
  NumberInput,
  PhoneInput,
  Radio,
  RadioGroup,
  Select,
  Textarea,
  TimeField,
} from 'ionbase-ui';

import { TEAMS, type AgentDraft } from '../../data/agents';
import { formatDay, formatTime, today } from '../../lib/dates';
import type { FieldErrors } from './validate';

const MODELS = [
  {
    value: 'swift-s',
    label: 'Swift S',
    description: 'Fastest and cheapest. Routing, tagging, short replies.',
  },
  {
    value: 'swift-m',
    label: 'Swift M',
    description: 'Fast, with better judgement on ambiguous input.',
  },
  {
    value: 'atlas-m',
    label: 'Atlas M',
    description: 'Balanced. The default for most agents.',
  },
  {
    value: 'atlas-l',
    label: 'Atlas L',
    description: 'Long documents and multi-step reasoning.',
  },
  {
    value: 'atlas-l-vision',
    label: 'Atlas L Vision',
    description: 'Reads scans, receipts and screenshots.',
  },
  {
    value: 'sage-xl',
    label: 'Sage XL',
    description: 'Deepest reasoning. Slow; use for high-stakes reviews.',
  },
  {
    value: 'sage-xl-code',
    label: 'Sage XL Code',
    description: 'Tuned for reading and changing code.',
  },
  {
    value: 'relay-embed',
    label: 'Relay Embed',
    description: 'Embeddings only. Search and clustering.',
  },
];

const FREQUENCIES = [
  { value: 'hourly', label: 'Every hour' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Every weekday' },
  { value: 'weekly', label: 'Every week' },
];

const NOTIFY_LABELS = [
  ['failed', 'A run fails'],
  ['approval', 'A run needs approval'],
  ['budget', '80% of the budget is spent'],
] as const;

interface StepProps {
  values: AgentDraft;
  errors: FieldErrors;
  onChange: (patch: Partial<AgentDraft>) => void;
  onBlur: (field: string) => void;
}

const invalid = (errors: FieldErrors, field: string) => ({
  isInvalid: Boolean(errors[field]),
  errorMessage: errors[field],
});

export function BasicsStep({
  values,
  errors,
  onChange,
  onBlur,
  model,
  onModelChange,
}: StepProps & {
  model: string | null;
  onModelChange: (m: string | null) => void;
}) {
  return (
    <div className="demo-form__fields">
      <Input
        id="field-name"
        label="Name"
        isRequired
        value={values.name}
        onChange={(name) => onChange({ name })}
        onBlur={() => onBlur('name')}
        description="Shown in approvals and the run log."
        {...invalid(errors, 'name')}
      />
      <Textarea
        id="field-purpose"
        label="What it does"
        isRequired
        rows={3}
        value={values.purpose}
        onChange={(purpose) => onChange({ purpose })}
        onBlur={() => onBlur('purpose')}
        description="One or two sentences a reviewer can check a run against."
        {...invalid(errors, 'purpose')}
      />
      <div className="demo-form__pair">
        <Select
          id="field-team"
          label="Owning team"
          placeholder="Choose a team"
          options={TEAMS}
          value={values.team ?? ''}
          onChange={(e) => onChange({ team: e.target.value || null })}
          onBlur={() => onBlur('team')}
          {...invalid(errors, 'team')}
        />
        <Combobox
          id="field-model"
          label="Model"
          placeholder="Search models"
          options={MODELS}
          selectedKey={model}
          onSelectionChange={(key) => {
            onModelChange(key);
            onBlur('model');
          }}
          emptyLabel="No model matches. Try a size, like “L”, or a use, like “code”."
          {...invalid(errors, 'model')}
        />
      </div>
    </div>
  );
}

export function TriggerStep({ values, errors, onChange, onBlur }: StepProps) {
  return (
    <div className="demo-form__fields">
      <RadioGroup
        label="What starts a run?"
        value={values.trigger}
        onChange={(trigger) =>
          onChange({ trigger: trigger as AgentDraft['trigger'] })
        }
      >
        <Radio value="schedule">On a schedule</Radio>
        <Radio value="webhook">When a webhook is called</Radio>
        <Radio value="manual">Only when someone starts it</Radio>
      </RadioGroup>

      {values.trigger === 'schedule' && (
        <Fieldset
          label="Schedule"
          orientation="horizontal"
          className="demo-form__schedule"
        >
          <DatePicker
            id="field-startDate"
            label="Start date"
            isRequired
            minValue={today()}
            value={values.startDate}
            onChange={(startDate) => {
              onChange({ startDate });
              onBlur('startDate');
            }}
            {...invalid(errors, 'startDate')}
          />
          <Select
            label="Repeats"
            options={FREQUENCIES}
            value={values.frequency}
            onChange={(e) => onChange({ frequency: e.target.value })}
          />
          {/* Hourly runs at every hour, so a time of day would mean nothing. */}
          {values.frequency !== 'hourly' && (
            <TimeField
              id="field-runAt"
              label="Runs at"
              description="Workspace time, UTC."
              isRequired
              value={values.runAt}
              onChange={(runAt) => {
                onChange({ runAt });
                onBlur('runAt');
              }}
              {...invalid(errors, 'runAt')}
            />
          )}
        </Fieldset>
      )}

      <Divider />

      <PhoneInput
        id="field-escalationPhone"
        label="Escalation phone (optional)"
        type="tel"
        autoComplete="tel"
        value={values.escalationPhone}
        onChange={(escalationPhone) => onChange({ escalationPhone })}
        onBlur={() => onBlur('escalationPhone')}
        description="Texted when a run fails twice in a row."
        {...invalid(errors, 'escalationPhone')}
      />
    </div>
  );
}

export function GuardrailsStep({
  values,
  errors,
  onChange,
  onBlur,
  files,
  onFilesChange,
}: StepProps & { files: File[]; onFilesChange: (files: File[]) => void }) {
  const earlier = values.knowledgeFiles.filter(
    (name) => !files.some((f) => f.name === name),
  );
  return (
    <div className="demo-form__fields">
      <FileUpload
        id="field-knowledge"
        label="Knowledge files (optional)"
        multiple
        accept=".pdf,.md,.txt,.csv"
        maxSize={10 * 1024 * 1024}
        maxFiles={5}
        files={files}
        onChange={onFilesChange}
        hint="PDF, Markdown, text or CSV. Up to 5 files, 10 MB each."
      />
      {earlier.length > 0 && (
        <p className="ion-text-body-sm demo-muted">
          Attached in an earlier session: {earlier.join(', ')}
        </p>
      )}

      <Checkbox
        isSelected={values.requireApproval}
        onSelectionChange={(requireApproval) => onChange({ requireApproval })}
      >
        Ask a human before anything irreversible — sending, paying, deleting
      </Checkbox>

      <CheckboxGroup
        id="field-notifyOn"
        label="Notify the team when"
        description="Sent to the owning team’s channel."
        isRequired
        value={values.notifyOn}
        onChange={(notifyOn) => {
          onChange({ notifyOn });
          onBlur('notifyOn');
        }}
        {...invalid(errors, 'notifyOn')}
      >
        <Checkbox value="failed">A run fails</Checkbox>
        <Checkbox value="approval">A run needs approval</Checkbox>
        <Checkbox value="budget">80% of the budget is spent</Checkbox>
      </CheckboxGroup>

      <NumberInput
        id="field-monthlyTokenBudget"
        label="Monthly token budget"
        isRequired
        minValue={1_000}
        maxValue={5_000_000}
        step={10_000}
        value={
          values.monthlyTokenBudget.trim()
            ? Number(values.monthlyTokenBudget)
            : null
        }
        onChange={(n) =>
          onChange({ monthlyTokenBudget: n === null ? '' : String(n) })
        }
        onBlur={() => onBlur('monthlyTokenBudget')}
        description="Runs stop and ask for more once this is spent."
        {...invalid(errors, 'monthlyTokenBudget')}
      />
    </div>
  );
}

export function ReviewStep({
  values,
  model,
  files,
  onEdit,
}: {
  values: AgentDraft;
  model: string | null;
  files: File[];
  onEdit: (step: number) => void;
}) {
  const groups: { step: number; title: string; rows: [string, string][] }[] = [
    {
      step: 0,
      title: 'Basics',
      rows: [
        ['Name', values.name],
        ['What it does', values.purpose],
        [
          'Owning team',
          TEAMS.find((t) => t.value === values.team)?.label ?? '—',
        ],
        ['Model', MODELS.find((m) => m.value === model)?.label ?? '—'],
      ],
    },
    {
      step: 1,
      title: 'Trigger',
      rows: [
        [
          'Starts',
          values.trigger === 'schedule'
            ? `${FREQUENCIES.find((f) => f.value === values.frequency)?.label}${
                values.frequency !== 'hourly' && values.runAt
                  ? ` at ${formatTime(values.runAt)} UTC`
                  : ''
              }, from ${values.startDate ? formatDay(values.startDate) : '—'}`
            : values.trigger === 'webhook'
              ? 'When its webhook is called'
              : 'Only when someone starts it',
        ],
        ['Escalation phone', values.escalationPhone || 'None'],
      ],
    },
    {
      step: 2,
      title: 'Guardrails',
      rows: [
        [
          'Knowledge files',
          [
            ...new Set([...values.knowledgeFiles, ...files.map((f) => f.name)]),
          ].join(', ') || 'None',
        ],
        [
          'Human approval',
          values.requireApproval ? 'Before anything irreversible' : 'Never',
        ],
        [
          'Notify the team when',
          NOTIFY_LABELS.filter(([v]) => values.notifyOn.includes(v))
            .map(([, label]) => label)
            .join(', ') || 'Never',
        ],
        [
          'Monthly token budget',
          Number(values.monthlyTokenBudget).toLocaleString('en'),
        ],
      ],
    },
  ];

  return (
    <div className="demo-form__fields">
      {groups.map((g) => (
        <section
          key={g.title}
          className="demo-review"
          aria-labelledby={`review-${g.step}`}
        >
          <div className="demo-review__head">
            <h3 id={`review-${g.step}`} className="ion-text-h6">
              {g.title}
            </h3>
            <Button size="sm" variant="tertiary" onClick={() => onEdit(g.step)}>
              Edit {g.title.toLowerCase()}
            </Button>
          </div>
          <dl className="demo-review__list">
            {g.rows.map(([k, v]) => (
              <div key={k} className="demo-review__row">
                <dt className="ion-text-body-sm demo-muted">{k}</dt>
                <dd className="ion-text-body-sm">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
