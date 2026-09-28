import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import {
  AgentActivity,
  AgentActivityStep,
  ApprovalGate,
  Avatar,
  AvatarGroup,
  Citation,
  CitationList,
  CitationListItem,
  CommandPalette,
  DualListbox,
  ConfidenceIndicator,
  FileUpload,
  I18nProvider,
  Kbd,
  Pagination,
  PromptInput,
  ScrollProgress,
  Slider,
  StatGroup,
  StatTile,
  Stepper,
  StepperStep,
  ToolCall,
  type RejectedFile,
  type ShortcutKeyLabels,
} from 'ionbase-ui';

/**
 * Pseudo-localised: every built-in string replaced with a `⟦marker⟧`, in a
 * Russian locale, and every surface a user meets read back — text, names,
 * placeholders, titles, live regions. Any Latin word left over is a string the
 * override did not reach: still English, in a product that asked for another
 * language.
 *
 * Caller data is marked too, so what is left is the component's own. Russian
 * because its digits group and its units read differently — "1,5 КБ", "1,2 с" —
 * which is how these stories see numbers follow the locale rather than the
 * English they were written in.
 *
 * `scripts/verify-strings.mjs` proves each string CAN be replaced; these
 * prove the replacement arrives.
 */
const meta: Meta = {
  title: 'Foundations/Localised strings',
  decorators: [
    (Story) => (
      <I18nProvider locale="ru-RU">
        <Story />
      </I18nProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Every string a component shows or announces can be replaced — by a prop, or a key in its `labels`. `dist/meta/strings.json` lists them all, with how. These stories replace each one with a marker and check no English is left.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** A marker: a translated string, as far as the test can tell. */
const m = (key: string) => `⟦${key}⟧`;

const ATTRIBUTES = [
  'aria-label',
  'aria-valuetext',
  'aria-description',
  'aria-roledescription',
  'alt',
  'title',
  'placeholder',
];

/** Everything under `root` a person reads or hears. */
const surfaces = (root: Element) => {
  const out: string[] = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) out.push(walk.currentNode.nodeValue ?? '');
  for (const el of [root, ...root.querySelectorAll('*')])
    for (const a of ATTRIBUTES) {
      const v = el.getAttribute(a);
      if (v) out.push(v);
    }
  return out;
};

/** Anything still English once the markers are taken out. */
const english = (root: Element) =>
  surfaces(root)
    .map((s) => s.replace(/⟦[^⟧]*⟧/g, ''))
    .filter((s) => /[A-Za-z]{2,}/.test(s));

const expectNoEnglish = async (...roots: Element[]) => {
  for (const root of roots) await expect(english(root)).toEqual([]);
};

const expectSaid = async (root: Element, ...markers: string[]) => {
  const all = surfaces(root).join('\n');
  for (const marker of markers) await expect(all).toContain(marker);
};

export const Pager: Story = {
  render: () => {
    const labels = {
      previous: m('previous'),
      next: m('next'),
      page: (p: string) => m(`page ${p}`),
      summary: (p: string, n: string) => m(`summary ${p}/${n}`),
      pageSize: m('pageSize'),
      perPage: (n: string) => m(`perPage ${n}`),
    };
    return (
      <div>
        <Pagination
          aria-label={m('nav')}
          page={2}
          pageCount={1200}
          showPageSize
          pageSize={25}
          onPageSizeChange={() => {}}
          labels={labels}
        />
        <Pagination
          aria-label={m('nav')}
          type="simple"
          page={2}
          pageCount={1200}
          labels={labels}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    await expectNoEnglish(canvasElement);
    await expectSaid(
      canvasElement,
      m('previous'),
      m('next'),
      m('page 3'),
      m('pageSize'),
      m('perPage 25'),
      // In the locale's digits: "1 200", grouped with a space.
      m(`summary 2/${new Intl.NumberFormat('ru-RU').format(1200)}`),
    );
  },
};

const file = (name: string, size: number, type = 'image/png') => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

/** Dropped rather than chosen: a drop is not filtered by `accept` first. */
const drop = (target: Element, files: File[]) => {
  const data = new DataTransfer();
  for (const f of files) data.items.add(f);
  target.dispatchEvent(
    new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: data,
    }),
  );
};

const uploadLabels = {
  notAccepted: (name: string) => m(`notAccepted ${name}`),
  tooLarge: (name: string, size: string, limit: string) =>
    m(`tooLarge ${name}`) + ` ${size} ${limit}`,
  tooMany: (name: string, max: number) => m(`tooMany ${name} ${max}`),
  onlyOne: (name: string) => m(`onlyOne ${name}`),
  selected: (n: number) => m(`selected ${n}`),
};

function Upload({ multiple }: { multiple: boolean }) {
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  return (
    <div data-multiple={multiple}>
      <FileUpload
        label={m('label')}
        prompt={m('prompt')}
        hint={m('hint')}
        accept="image/png"
        maxSize={1000}
        maxFiles={2}
        multiple={multiple}
        onReject={setRejected}
        removeLabel={(name) => m(`remove ${name}`)}
        labels={uploadLabels}
      />
      <ul data-testid="rejected">
        {rejected.map((r) => (
          <li key={r.file.name}>{r.message}</li>
        ))}
      </ul>
    </div>
  );
}

export const Refusals: Story = {
  render: () => (
    <div>
      <Upload multiple />
      <Upload multiple={false} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [many, one] = canvasElement.querySelectorAll(
      '.ion-file-upload__target',
    );
    drop(many, [
      file(m('a'), 512),
      file(m('big'), 1500),
      file(m('bigger'), 10_200),
      file(m('text'), 10, 'text/plain'),
      file(m('b'), 10),
      file(m('c'), 10),
    ]);
    drop(one, [file(m('d'), 10), file(m('e'), 10)]);
    await waitFor(() =>
      expect(
        canvasElement.querySelectorAll('.ion-file-upload__file'),
      ).toHaveLength(3),
    );
    await expectNoEnglish(canvasElement);
    await expectSaid(
      canvasElement,
      m(`notAccepted ${m('text')}`),
      m(`tooLarge ${m('big')}`),
      m(`tooMany ${m('c')} 2`),
      m(`onlyOne ${m('e')}`),
      m(`remove ${m('a')}`),
      m('selected 2'),
      m('selected 1'),
    );
    // Sizes in the locale's words: "512 байт", "1,5 КБ" — and "10,2 КБ",
    // not a rounded "10 КБ" beside a 1 КБ limit.
    const text = canvasElement.textContent ?? '';
    const kb = (n: number) =>
      new Intl.NumberFormat('ru-RU', {
        style: 'unit',
        unit: 'kilobyte',
        unitDisplay: 'short',
        minimumFractionDigits: 1,
      }).format(n);
    await expect(text).toContain(
      new Intl.NumberFormat('ru-RU', {
        style: 'unit',
        unit: 'byte',
        unitDisplay: 'long',
      }).format(512),
    );
    await expect(text).toContain(kb(1.5));
    await expect(text).toContain(kb(10.2));
  },
};

/** Every key the palette's hints and a `mod+n` shortcut draw, on either platform. */
const keys: ShortcutKeyLabels = {
  command: { name: m('Command') },
  control: { symbol: m('Ctrl'), name: m('Control') },
  shift: { symbol: m('Shift'), name: m('Shift') },
  arrowup: { name: m('Up') },
  arrowdown: { name: m('Down') },
  enter: { name: m('Enter') },
  escape: { symbol: m('Esc'), name: m('Escape') },
};

export const Palette: Story = {
  render: () => (
    <CommandPalette
      defaultOpen
      openShortcut={null}
      onAction={() => {}}
      label={m('label')}
      placeholder={m('placeholder')}
      emptyLabel={m('empty')}
      labels={{
        results: (n) => m(`results ${n}`),
        move: m('move'),
        run: m('run'),
        close: m('close'),
        keys,
      }}
      commands={[
        {
          id: 'new',
          label: m('new'),
          shortcut: 'mod+n',
          section: m('section'),
        },
        { id: 'open', label: m('open'), section: m('section') },
      ]}
    />
  ),
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    const field = within(dialog).getByRole('combobox');
    await expectNoEnglish(dialog);
    await expectSaid(
      dialog,
      m('move'),
      m('run'),
      m('close'),
      m('Up'),
      m('Enter'),
    );

    await userEvent.type(field, 'new');
    await waitFor(() => expectSaid(dialog, m('results 1')));
    await userEvent.type(field, 'zzz');
    await waitFor(() => expectSaid(dialog, m('empty')));
    await expectNoEnglish(dialog);
    await userEvent.keyboard('{Escape}');
  },
};

export const Keys: Story = {
  render: () => (
    <div>
      <Kbd shortcut="mod+shift+esc" platform="mac" keyLabels={keys} />
      <Kbd shortcut="mod+shift+esc" platform="other" keyLabels={keys} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expectNoEnglish(canvasElement);
    const [mac, other] = canvasElement.querySelectorAll('.ion-kbd-group');
    const drawn = (group: Element) =>
      [...group.querySelectorAll('.ion-kbd')].map((k) => k.textContent);
    // A Mac's glyphs are the same in every language, and stay.
    await expect(drawn(mac)).toEqual(['⇧', '⌘', m('Esc')]);
    await expect(drawn(other)).toEqual([m('Ctrl'), m('Shift'), m('Esc')]);
  },
};

export const Steps: Story = {
  render: () => (
    <Stepper
      label={m('label')}
      labels={{
        position: (s, n) => m(`step ${s}/${n}`),
        incomplete: m('incomplete'),
        complete: m('complete'),
        error: m('error'),
        current: m('current'),
        currentError: m('currentError'),
      }}
    >
      <StepperStep status="complete">{m('one')}</StepperStep>
      <StepperStep status="error">{m('two')}</StepperStep>
      <StepperStep isCurrent>{m('three')}</StepperStep>
      <StepperStep status="error" isCurrent>
        {m('four')}
      </StepperStep>
      <StepperStep>{m('five')}</StepperStep>
    </Stepper>
  ),
  play: async ({ canvasElement }) => {
    await expectNoEnglish(canvasElement);
    await expectSaid(
      canvasElement,
      m('step 1/5'),
      m('complete'),
      m('error'),
      m('current'),
      m('currentError'),
      m('incomplete'),
    );
  },
};

export const AgentRun: Story = {
  render: function Render() {
    const [status, setStatus] = useState<'pending' | 'approved'>('pending');
    return (
      <div>
        <AgentActivity>
          <AgentActivityStep status="done" statusLabel={m('done')}>
            {m('one')}
          </AgentActivityStep>
          <AgentActivityStep status="active" statusLabel={m('active')}>
            <span>{m('two')}</span>
          </AgentActivityStep>
          <AgentActivityStep status="failed" statusLabel={m('failed')}>
            {m('three')}
          </AgentActivityStep>
        </AgentActivity>
        <ToolCall
          title={m('title')}
          name={m('tool')}
          status="done"
          statusLabel={m('done')}
          input={{ q: 1 }}
          output={[1]}
          durationMs={1234}
          defaultExpanded
          labels={{
            input: m('input'),
            output: m('output'),
            inputName: (t) => m(`inputName ${t}`),
            outputName: (t) => m(`outputName ${t}`),
          }}
        />
        <ApprovalGate
          title={m('title')}
          status={status}
          statusLabel={status === 'approved' ? m('approved') : undefined}
          approveLabel={m('approve')}
          rejectLabel={m('reject')}
          editLabel={m('edit')}
          onApprove={() => setStatus('approved')}
          onReject={() => {}}
          onEdit={() => {}}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    await expectNoEnglish(canvasElement);
    // The run's announcement falls back to the active step's statusLabel,
    // since its label is not plain text.
    await waitFor(() => expectSaid(canvasElement, m('active')));
    await expectSaid(
      canvasElement,
      m('input'),
      m('output'),
      m(`inputName ${m('tool')}`),
      m(`outputName ${m('tool')}`),
    );
    // A duration in the locale's words: "1,2 с".
    await expect(canvasElement.textContent).toContain(
      new Intl.NumberFormat('ru-RU', {
        style: 'unit',
        unit: 'second',
        unitDisplay: 'narrow',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(1.234),
    );

    await userEvent.click(
      within(canvasElement).getByRole('button', { name: m('approve') }),
    );
    // Shown in place of the actions, and announced.
    await waitFor(() =>
      expect(
        canvasElement.querySelector('.ion-approval-gate__resolution'),
      ).toHaveTextContent(m('approved')),
    );
    await waitFor(() =>
      expect(
        canvasElement.querySelector('.ion-approval-gate__status'),
      ).toHaveTextContent(m('approved')),
    );
    await expectNoEnglish(canvasElement);
  },
};

export const Prompt: Story = {
  render: () => (
    <div>
      <PromptInput
        label={m('label')}
        placeholder={m('placeholder')}
        sendLabel={m('send')}
        submitHint={m('hint')}
      />
      <PromptInput
        label={m('label')}
        submitKey="mod-enter"
        submitHint={m('hint')}
        isRunning
        onStop={() => {}}
        stopLabel={m('stop')}
        stoppingLabel={m('stopping')}
      />
      <PromptInput
        label={m('label')}
        submitHint={m('hint')}
        isRunning
        isStopping
        onStop={() => {}}
        stopLabel={m('stop')}
        stoppingLabel={m('stopping')}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expectNoEnglish(canvasElement);
    await expectSaid(
      canvasElement,
      m('send'),
      m('hint'),
      m('stop'),
      m('stopping'),
    );
  },
};

export const EverythingElse: Story = {
  render: () => (
    <div>
      <AvatarGroup max={2} overflowLabel={(n) => m(`more ${n}`)}>
        <Avatar initials="1" alt={m('a')} />
        <Avatar initials="2" alt={m('b')} />
        <Avatar initials="3" alt={m('c')} />
        <Avatar initials="4" alt={m('d')} />
      </AvatarGroup>
      <p>
        {m('claim')}
        <Citation
          index={1}
          source={m('source')}
          href="#1"
          label={m('cite 1')}
        />
        <Citation index={2} source={m('source')} label={m('cite 2')} />
      </p>
      <CitationList label={m('sources')}>
        <CitationListItem index={1} source={m('source')} />
      </CitationList>
      <ScrollProgress
        progress={32}
        activeId="b"
        sections={[
          { id: 'a', label: m('a') },
          { id: 'b', label: m('b') },
        ]}
        triggerLabel={(p, s) => m(`progress ${p} ${s}`)}
      />
      <StatGroup>
        <StatTile
          label={m('label')}
          value="1 200"
          change={3.2}
          comparison={m('comparison')}
          labels={{
            change: (c) => m(`change ${c}`),
            better: m('better'),
            worse: m('worse'),
            noChange: m('noChange'),
          }}
        />
        <StatTile
          label={m('label')}
          value="0"
          change={0}
          comparison={m('comparison')}
          labels={{ noChange: m('noChange') }}
        />
      </StatGroup>
      <ConfidenceIndicator level="high" basis={m('basis')} label={m('high')} />
      <Slider
        label={m('label')}
        defaultValue={[20, 80]}
        thumbLabels={[m('min'), m('max')]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expectNoEnglish(canvasElement);
    await expectSaid(
      canvasElement,
      m('more 2'),
      m('cite 1'),
      m('cite 2'),
      m('sources'),
      m(`progress 32 ${m('b')}`),
      m('change 3.2'),
      m('better'),
      m('noChange'),
      m('high'),
    );
  },
};

/** Both lists' names, the four buttons, the empty text and each announcement. */
export const DuelingLists: Story = {
  render: () => (
    <div style={{ width: 640 }}>
      <DualListbox
        aria-label={m('field')}
        isReorderable
        options={[
          { value: 'a', label: m('a') },
          { value: 'b', label: m('b') },
        ]}
        labels={{
          available: m('available'),
          selected: m('selected'),
          add: m('add'),
          remove: m('remove'),
          moveUp: m('up'),
          moveDown: m('down'),
          empty: m('empty'),
          moved: (n, list) => m(`moved ${n} ${list}`),
          reordered: (labels, p, t) => m(`reordered ${labels[0]} ${p} ${t}`),
        }}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expectNoEnglish(canvasElement);
    await expectSaid(canvasElement, m('empty'));
    const c = within(canvasElement);
    // Enter moves the option focused on arriving; twice takes both across.
    const [available] = c.getAllByRole('listbox');
    const moveFirst = async () => {
      available.focus();
      await waitFor(() =>
        expect(available.contains(document.activeElement)).toBe(true),
      );
      await waitFor(() =>
        expect(document.activeElement?.getAttribute('role')).toBe('option'),
      );
      await userEvent.keyboard('{Enter}');
      // Focus follows the option into the other list before anything else.
      await waitFor(() =>
        expect(
          c.getAllByRole('listbox')[1].contains(document.activeElement),
        ).toBe(true),
      );
    };
    await moveFirst();
    await moveFirst();
    await expectSaid(canvasElement, m(`moved 1 ${m('selected')}`));
    const [, selected] = c.getAllByRole('listbox');
    // A pointer's click picks; a virtual one — a screen reader's — moves,
    // as Enter does.
    await browserUser.click(within(selected).getAllByRole('option')[1]);
    await browserUser.click(c.getByRole('button', { name: m('up') }));
    await expectSaid(canvasElement, m(`reordered ${m('b')} 1 2`));
    await expectNoEnglish(canvasElement);
  },
};
