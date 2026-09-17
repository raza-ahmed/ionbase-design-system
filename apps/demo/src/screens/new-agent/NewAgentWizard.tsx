import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Link,
  Stepper,
  StepperStep,
  useToast,
} from 'ionbase-ui';

import { createAgent, type AgentDraft } from '../../data/agents';
import { write } from '../../data/store';
import { useDemoSettings } from '../../lib/demo-settings';
import { href, navigate } from '../../lib/router';
import { clearDraft, EMPTY_DRAFT, loadDraft, saveDraft, STEPS } from './draft';
import { BasicsStep, GuardrailsStep, ReviewStep, TriggerStep } from './steps';
import { FIELD_LABELS, validateStep, type FieldErrors } from './validate';

/**
 * The Wizard pattern, each step a Form. Validation runs per step on Next and per
 * field on blur; a failed Next shows an error summary and moves focus to it;
 * accepted steps save as they land, and a resumed draft opens on the first
 * step that is not done.
 */
export function NewAgentWizard() {
  const settings = useDemoSettings();
  const { toast } = useToast();

  const [resumed] = useState(loadDraft);
  const [values, setValues] = useState<AgentDraft>(
    resumed?.values ?? EMPTY_DRAFT,
  );
  const [model, setModel] = useState<string | null>(resumed?.model ?? null);
  const [completed, setCompleted] = useState(resumed?.completed ?? -1);
  const [step, setStep] = useState(() =>
    Math.min((resumed?.completed ?? -1) + 1, STEPS.length - 1),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showResumed, setShowResumed] = useState(resumed !== null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Focus follows the step, so a screen-reader user hears that the page changed.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const allErrors = validateStep(step, values, model);
  const visibleErrors: FieldErrors = Object.fromEntries(
    Object.entries(allErrors).filter(([k]) => attempted || touched.has(k)),
  );

  const update = (patch: Partial<AgentDraft>) =>
    setValues((v) => ({ ...v, ...patch }));
  const blur = (field: string) => setTouched((t) => new Set(t).add(field));
  const goTo = (n: number) => {
    setStep(n);
    setAttempted(false);
    setServerError(null);
  };

  async function next() {
    setServerError(null);
    if (Object.keys(allErrors).length > 0) {
      setAttempted(true);
      // Wait a frame so the summary exists before it takes focus.
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setPending(true);
    try {
      if (step === STEPS.length - 1) {
        const agent = await createAgent(values, settings);
        clearDraft();
        toast({
          intent: 'success',
          title: `Created ${agent.name}`,
          message: 'It is paused until you start it.',
        });
        navigate('agents');
        return;
      }
      await write(
        settings,
        'This step wasn’t saved: the agents service did not respond.',
      );
      const accepted = Math.max(completed, step);
      setCompleted(accepted);
      saveDraft({
        // File objects can't be stored, so a resumed draft keeps their names.
        values: {
          ...values,
          knowledgeFiles: [
            ...new Set([...values.knowledgeFiles, ...files.map((f) => f.name)]),
          ],
        },
        completed: accepted,
        model,
      });
      goTo(step + 1);
    } catch (e) {
      setServerError((e as Error).message);
      requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      setPending(false);
    }
  }

  function saveAndExit() {
    saveDraft({ values, completed, model });
    toast({
      intent: 'information',
      title: 'Draft saved',
      message: 'Open New agent again to pick up where you left off.',
    });
    navigate('agents');
  }

  function startOver() {
    clearDraft();
    setValues(EMPTY_DRAFT);
    setModel(null);
    setCompleted(-1);
    setFiles([]);
    setTouched(new Set());
    setShowResumed(false);
    goTo(0);
  }

  const errorEntries = Object.entries(visibleErrors);
  const isLast = step === STEPS.length - 1;

  return (
    <div className="demo-page demo-page--narrow">
      <Breadcrumb>
        <BreadcrumbItem href={href('agents')}>Agents</BreadcrumbItem>
        <BreadcrumbItem isCurrent>New agent</BreadcrumbItem>
      </Breadcrumb>

      <h1 id="page-title" className="ion-text-h4">
        New agent
      </h1>

      <Stepper label="New agent progress">
        {STEPS.map((name, i) => (
          <StepperStep
            key={name}
            isCurrent={i === step}
            status={
              i === step && serverError
                ? 'error'
                : i <= completed
                  ? 'complete'
                  : 'incomplete'
            }
            // Accepted steps can be revisited; the Stepper ignores it elsewhere.
            onPress={i <= completed ? () => goTo(i) : undefined}
          >
            {name}
          </StepperStep>
        ))}
      </Stepper>

      {showResumed && (
        <Alert
          intent="information"
          title="Picked up your draft"
          onDismiss={() => setShowResumed(false)}
          dismissLabel="Dismiss draft notice"
          actions={
            <Button size="sm" variant="secondary" onClick={startOver}>
              Start over
            </Button>
          }
        >
          You're on the first step that isn't finished yet.
        </Alert>
      )}

      <form
        className="demo-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void next();
        }}
        aria-labelledby="step-title"
      >
        <div>
          <p className="ion-text-body-sm demo-muted">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2
            id="step-title"
            ref={headingRef}
            tabIndex={-1}
            className="ion-text-h5"
          >
            {STEPS[step]}
          </h2>
        </div>

        <div ref={summaryRef} tabIndex={-1} className="demo-focus-target">
          {serverError && (
            <Alert intent="error" title="Couldn't save this step">
              {serverError} Everything you entered is still here.
            </Alert>
          )}
          {attempted && errorEntries.length > 0 && (
            <Alert
              intent="error"
              title={`Fix ${errorEntries.length} ${errorEntries.length === 1 ? 'field' : 'fields'} to continue`}
            >
              <ul className="demo-list">
                {errorEntries.map(([field, message]) => (
                  <li key={field}>
                    {/* In-page navigation to the field, so a Link, not a Button. */}
                    <Link
                      onPress={() =>
                        document.getElementById(`field-${field}`)?.focus()
                      }
                    >
                      {FIELD_LABELS[field]}
                    </Link>
                    {' — '}
                    {message}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
        </div>

        {step === 0 && (
          <BasicsStep
            values={values}
            model={model}
            errors={visibleErrors}
            onChange={update}
            onModelChange={setModel}
            onBlur={blur}
          />
        )}
        {step === 1 && (
          <TriggerStep
            values={values}
            errors={visibleErrors}
            onChange={update}
            onBlur={blur}
          />
        )}
        {step === 2 && (
          <GuardrailsStep
            values={values}
            files={files}
            errors={visibleErrors}
            onChange={update}
            onFilesChange={setFiles}
            onBlur={blur}
          />
        )}
        {step === 3 && (
          <ReviewStep
            values={values}
            model={model}
            files={files}
            onEdit={goTo}
          />
        )}

        <div className="demo-form__actions">
          {step > 0 && (
            <Button
              variant="tertiary"
              isDisabled={pending}
              onClick={() => goTo(step - 1)}
            >
              Back
            </Button>
          )}
          <span className="demo-form__spacer" />
          {!isLast && (
            <Button
              variant="secondary"
              isDisabled={pending}
              onClick={saveAndExit}
            >
              Save and exit
            </Button>
          )}
          <Button type="submit" isDisabled={pending}>
            {pending
              ? isLast
                ? 'Creating…'
                : 'Saving…'
              : isLast
                ? 'Create agent'
                : `Next: ${STEPS[step + 1]}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
