import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AvatarGradient,
  Button,
  ChatMessage,
  Citation,
  CitationList,
  CitationListItem,
  ConfidenceIndicator,
  CopyButton,
  EmptyState,
  LogoMark,
  PageHeader,
  PromptInput,
  ScrollProgress,
  Spinner,
  Stack,
  StreamingText,
} from 'ionbase-ui';

import {
  answerFor,
  answerLength,
  ANSWERS,
  SUGGESTIONS,
  type CannedAnswer,
} from '../../data/assistant';
import { useDemoSettings } from '../../lib/demo-settings';

type TurnStatus = 'searching' | 'streaming' | 'done' | 'interrupted';

interface Turn {
  id: string;
  question: string;
  answer: CannedAnswer;
  revealed: number;
  status: TurnStatus;
  askedAt: Date;
  /** When the answer ended — complete or interrupted. */
  answeredAt?: Date;
}

const CHARS_PER_TICK = 6;

/**
 * The AssistantAnswer pattern as a thread. Citations and confidence appear only
 * once an answer is complete; an interrupted answer keeps its text, says it is
 * incomplete, and loses its confidence rating.
 */
export function AssistantScreen() {
  const settings = useDemoSettings();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState<string | undefined>();
  const counter = useRef(0);

  const busy = turns.some(
    (t) => t.status === 'searching' || t.status === 'streaming',
  );

  // One engine for the thread: advance whichever turn is in flight.
  useEffect(() => {
    if (!busy) return;
    const current = turns.find(
      (t) => t.status === 'searching' || t.status === 'streaming',
    );
    if (!current) return;
    // Forced "loading": the search never returns, so the spinner stays.
    if (current.status === 'searching' && settings.state === 'loading') return;

    const delay =
      current.status === 'searching' ? Math.max(700, settings.latency) : 30;
    const timer = window.setTimeout(() => {
      setTurns((all) =>
        all.map((t) => {
          if (t.id !== current.id) return t;
          if (t.status === 'searching') return { ...t, status: 'streaming' };
          const total = answerLength(t.answer);
          const revealed = Math.min(total, t.revealed + CHARS_PER_TICK);
          // Forced "error": the stream drops a little under halfway through.
          if (settings.state === 'error' && revealed >= total * 0.45) {
            return {
              ...t,
              revealed,
              status: 'interrupted',
              answeredAt: new Date(),
            };
          }
          const done = revealed >= total;
          return {
            ...t,
            revealed,
            status: done ? 'done' : 'streaming',
            answeredAt: done ? new Date() : undefined,
          };
        }),
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [turns, busy, settings.state, settings.latency]);

  // Reading position for ScrollProgress — the component computes nothing itself.
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.round((window.scrollY / max) * 100) : 100);
      const middle = window.innerHeight / 2;
      const passed = turns.filter((t) => {
        const el = document.getElementById(`turn-${t.id}`);
        return el && el.getBoundingClientRect().top < middle;
      });
      setActiveId(passed.at(-1)?.id ?? turns[0]?.id);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [turns]);

  function ask(question: string, answer: CannedAnswer = answerFor(question)) {
    if (!question.trim() || busy) return;
    counter.current += 1;
    const id = `t${counter.current}`;
    setTurns((all) => [
      ...all,
      {
        id,
        question: question.trim(),
        answer,
        revealed: 0,
        status: 'searching',
        askedAt: new Date(),
      },
    ]);
    setDraft('');
    requestAnimationFrame(() =>
      document
        .getElementById(`turn-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  const stop = () =>
    setTurns((all) =>
      all.map((t) =>
        t.status === 'searching' || t.status === 'streaming'
          ? { ...t, status: 'interrupted', answeredAt: new Date() }
          : t,
      ),
    );

  const latest = turns.at(-1);

  return (
    <div className="demo-assistant">
      {/*
       * On the right edge, so the list opens leftward — back over the thread
       * rather than off the screen.
       */}
      {turns.length > 1 && (
        <aside className="demo-assistant__rail" aria-label="Thread position">
          <ScrollProgress
            progress={progress}
            activeId={activeId}
            placement="left"
            sections={turns.map((t) => ({ id: t.id, label: t.question }))}
            onSelect={(id) => {
              const el = document.getElementById(`turn-${id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              el?.querySelector<HTMLElement>('h2')?.focus({
                preventScroll: true,
              });
            }}
          />
        </aside>
      )}
      <div className="demo-page demo-assistant__thread">
        <PageHeader
          titleId="page-title"
          title="Assistant"
          description="Answers from your runs, approvals and policies — with the sources to check them."
        />

        {turns.length === 0 && (
          <EmptyState
            reason="first-run"
            size="panel"
            headingLevel={2}
            title="Ask about your agents"
            description="Every answer shows what it was drawn from and how far to trust it. Try one of these:"
          >
            <Stack
              direction="row"
              wrap
              justify="center"
              gap={8}
              className="demo-suggestions"
            >
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    ask(
                      s.question,
                      ANSWERS.find((a) => a.id === s.id),
                    )
                  }
                >
                  {s.question}
                </Button>
              ))}
            </Stack>
          </EmptyState>
        )}

        {turns.map((t) => (
          <TurnView key={t.id} turn={t} />
        ))}

        {/* Completion is announced once, for the newest answer only. */}
        <p className="ion-visually-hidden" role="status">
          {latest?.status === 'done'
            ? 'Answer ready.'
            : latest?.status === 'interrupted'
              ? 'Answer incomplete.'
              : ''}
        </p>

        {/*
         * One stop control for the thread: the composer's send button becomes
         * it while an answer is in flight, so the answer itself carries none.
         */}
        <div className="demo-composer">
          <PromptInput
            label="Your question"
            placeholder="Ask about refunds, success targets, or anything else"
            value={draft}
            onChange={setDraft}
            onSubmit={(q) => ask(q)}
            isRunning={busy}
            onStop={stop}
            sendLabel="Ask"
          />
          {turns.length > 0 && !busy && (
            <Stack
              as="span"
              direction="row"
              wrap
              gap={8}
              className="demo-suggestions"
            >
              {SUGGESTIONS.filter(
                (s) => !turns.some((t) => t.answer.id === s.id),
              ).map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant="tertiary"
                  onClick={() =>
                    ask(
                      s.question,
                      ANSWERS.find((a) => a.id === s.id),
                    )
                  }
                >
                  {s.question}
                </Button>
              ))}
            </Stack>
          )}
        </div>
      </div>
    </div>
  );
}

/** A turn's time, as a thread shows it: the hour and minute. */
const clock = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/**
 * One question and its answer: two ChatMessages. The question keeps its h2 —
 * the thread's headings are how the rail and a screen reader move through
 * it — and the answer holds the AssistantAnswer pattern.
 */
function TurnView({ turn }: { turn: Turn }) {
  const { answer, revealed, status } = turn;
  const complete = status === 'done';

  // Reveal text up to `revealed`; a marker shows once the claim before it is whole.
  let budget = revealed;
  const nodes = answer.segments.map((seg, i) => {
    if (typeof seg === 'string') {
      const part = seg.slice(0, Math.max(0, budget));
      budget -= seg.length;
      return <span key={i}>{part}</span>;
    }
    if (budget < 0) return null;
    const src = answer.sources.find((s) => s.index === seg.cite)!;
    return (
      <Citation key={i} index={src.index} source={src.source} href={src.href} />
    );
  });
  const plain = answer.segments
    .filter((seg): seg is string => typeof seg === 'string')
    .join('');

  return (
    <section
      id={`turn-${turn.id}`}
      className="demo-turn"
      aria-labelledby={`q-${turn.id}`}
    >
      <ChatMessage
        from="person"
        author="Ada Reyes"
        avatar={
          <AvatarGradient
            size="sm"
            color="blue"
            initials="AR"
            alt="Ada Reyes"
          />
        }
        timestamp={turn.askedAt}
        timestampLabel={clock.format(turn.askedAt)}
      >
        <h2
          id={`q-${turn.id}`}
          tabIndex={-1}
          className="demo-turn__question ion-text-body ion-text--semibold"
        >
          {turn.question}
        </h2>
      </ChatMessage>

      <ChatMessage
        from="assistant"
        author="Ionbase assistant"
        avatar={<LogoMark size="sm" label="Ionbase assistant" />}
        timestamp={turn.answeredAt}
        timestampLabel={turn.answeredAt && clock.format(turn.answeredAt)}
        // Copy only once the answer is whole: a copied half-answer reads as
        // the whole one wherever it is pasted.
        actions={
          complete ? (
            <CopyButton value={plain} label="Copy answer" size="sm" />
          ) : undefined
        }
      >
        <div className="demo-turn__answer">
          {complete && answer.confidence && (
            <div className="demo-turn__meta">
              <ConfidenceIndicator
                level={answer.confidence.level}
                basis={answer.confidence.basis}
              />
            </div>
          )}

          {status === 'searching' ? (
            <Spinner
              size="sm"
              label="Searching workspace sources"
              isLabelVisible
            />
          ) : (
            <StreamingText
              isStreaming={status === 'streaming'}
              minLines={3}
              label={`Answer to: ${turn.question}`}
            >
              {nodes}
            </StreamingText>
          )}

          {status === 'interrupted' && (
            <Alert intent="warning" title="This answer is incomplete">
              It stopped part-way, so it has no sources or confidence rating.
              Ask again for the full answer.
            </Alert>
          )}

          {complete && answer.notice && (
            <Alert intent={answer.notice.intent} title={answer.notice.title}>
              {answer.notice.body}
            </Alert>
          )}

          {complete && answer.sources.length > 0 && (
            <CitationList label="Sources">
              {answer.sources.map((s) => (
                <CitationListItem
                  key={s.index}
                  index={s.index}
                  source={s.source}
                  href={s.href}
                >
                  {s.passage}
                </CitationListItem>
              ))}
            </CitationList>
          )}
        </div>
      </ChatMessage>
    </section>
  );
}
