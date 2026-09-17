import { useEffect, useRef, useState } from 'react';
import {
  AgentStop,
  Alert,
  AvatarGradient,
  Button,
  Citation,
  CitationList,
  CitationListItem,
  ConfidenceIndicator,
  EmptyState,
  LogoMark,
  ScrollProgress,
  Spinner,
  StreamingText,
  Textarea,
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
            return { ...t, revealed, status: 'interrupted' };
          }
          return {
            ...t,
            revealed,
            status: revealed >= total ? 'done' : 'streaming',
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
          ? { ...t, status: 'interrupted' }
          : t,
      ),
    );

  const latest = turns.at(-1);

  return (
    <div className="demo-assistant">
      {/*
       * Left of the thread, not right: ScrollProgress always opens its panel
       * rightwards, and the closed panel still takes layout width — on the right
       * edge it widened the page by 152px. Gap list.
       */}
      {turns.length > 1 && (
        <aside className="demo-assistant__rail" aria-label="Thread position">
          <ScrollProgress
            progress={progress}
            activeId={activeId}
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
        <div>
          <h1 id="page-title" className="ion-text-h3">
            Assistant
          </h1>
          <p className="ion-text-body demo-muted">
            Answers from your runs, approvals and policies — with the sources to
            check them.
          </p>
        </div>

        {turns.length === 0 && (
          <EmptyState
            reason="first-run"
            size="panel"
            headingLevel={2}
            title="Ask about your agents"
            description="Every answer shows what it was drawn from and how far to trust it. Try one of these:"
          >
            <div className="demo-suggestions">
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
            </div>
          </EmptyState>
        )}

        {turns.map((t) => (
          <TurnView key={t.id} turn={t} onStop={stop} />
        ))}

        {/* Completion is announced once, for the newest answer only. */}
        <p className="ion-visually-hidden" role="status">
          {latest?.status === 'done'
            ? 'Answer ready.'
            : latest?.status === 'interrupted'
              ? 'Answer incomplete.'
              : ''}
        </p>

        <form
          className="demo-composer"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <Textarea
            label="Your question"
            rows={2}
            value={draft}
            onChange={setDraft}
            description="Try asking about refunds, success targets, or anything else."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask(draft);
              }
            }}
          />
          <div className="demo-composer__actions">
            {turns.length > 0 && !busy && (
              <span className="demo-suggestions">
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
              </span>
            )}
            <span className="demo-form__spacer" />
            <Button type="submit" isDisabled={busy || !draft.trim()}>
              Ask
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TurnView({ turn, onStop }: { turn: Turn; onStop: () => void }) {
  const { answer, revealed, status } = turn;
  const inFlight = status === 'searching' || status === 'streaming';
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

  return (
    <section
      id={`turn-${turn.id}`}
      className="demo-turn"
      aria-labelledby={`q-${turn.id}`}
    >
      <div className="demo-turn__question">
        <AvatarGradient size="sm" color="blue" initials="AR" alt="Ada Reyes" />
        <h2
          id={`q-${turn.id}`}
          tabIndex={-1}
          className="ion-text-body ion-text--semibold"
        >
          {turn.question}
        </h2>
      </div>

      <div className="demo-turn__answer demo-panel">
        <div className="demo-turn__meta">
          <LogoMark size="sm" label="Ionbase assistant" />
          {inFlight && (
            <AgentStop size="sm" label="Stop answering" onStop={onStop} />
          )}
          {complete && answer.confidence && (
            <ConfidenceIndicator
              level={answer.confidence.level}
              basis={answer.confidence.basis}
            />
          )}
        </div>

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
            It stopped part-way, so it has no sources or confidence rating. Ask
            again for the full answer.
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
    </section>
  );
}
