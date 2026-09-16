import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Combobox } from 'ionbase-ui';

const meta: Meta<typeof Combobox> = {
  title: 'Components/Combobox',
  component: Combobox,
  tags: ['autodocs'],
  /*
   * Constrained, the way a form field actually is. Not decoration: the menu
   * matches the field's width, and a field stretched to the full canvas puts a
   * same-width menu past the viewport edge. The horizontal scrollbar that
   * follows makes react-aria close the popover — `useCloseOnScroll` is what
   * keeps an anchored overlay from drifting away from its trigger, and it
   * cannot tell that scroll from a real one.
   */
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '20rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A text field that filters a list down to one selected value.\n\n**Not `Select` with a search box.** `Select` wraps a native `<select>`, whose list the browser owns: it cannot be filtered and its rows can only hold text. Everything above about twenty options needs filtering, and `Select`\'s own contract has pointed at "a combobox — not yet in this system" since it was written.\n\n**Real focus never leaves the input.** Arrow keys move a *virtual* focus through the list via `aria-activedescendant`, which is what makes typing and browsing possible at the same time. The consequence for styling is that no option is ever `:hover` or `:focus` — the highlight is `[data-focused]`, which react-aria sets for both pointer and keyboard so the two can never disagree.\n\n**Filtering is `Intl.Collator`, not `toLowerCase().includes()`.** "resume" matches "résumé", and Turkish dotted/dotless I behaves the way a Turkish reader expects. The lowercase-and-includes version fails both, silently, in the locales least likely to be tested.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Combobox>;

/*
 * The listbox is portalled to document.body by react-aria's `Overlay`, so it is
 * not inside `canvasElement` and `canvas.*` cannot see it. Same as Popover and
 * Modal. Querying the body is not a workaround for the test — it is what a
 * screen reader does, and what any consumer's own test will have to do.
 */
const overlay = () => within(document.body);

/*
 * The chevron opens the list. Clicking the INPUT does not, and that is
 * react-aria's `menuTrigger: 'input'` default rather than a defect: a field
 * that opens a menu the moment the caret lands in it is loud in a long form.
 * The disclosure button is what makes "just show me everything" reachable.
 */
const open = async (canvas: ReturnType<typeof within>) =>
  userEvent.click(canvas.getByRole('button', { name: 'Show suggestions' }));

const countries = [
  { value: 'au', label: 'Australia', description: 'Oceania' },
  { value: 'br', label: 'Brazil', description: 'South America' },
  { value: 'ca', label: 'Canada', description: 'North America' },
  { value: 'de', label: 'Germany', description: 'Europe' },
  { value: 'jp', label: 'Japan', description: 'Asia' },
  { value: 'ke', label: 'Kenya', description: 'Africa' },
  { value: 'no', label: 'Norway', description: 'Europe', isDisabled: true },
  { value: 'pk', label: 'Pakistan', description: 'Asia' },
] as const;

const accented = [
  { value: 'r', label: 'Résumé' },
  { value: 'c', label: 'Café' },
  { value: 'p', label: 'Plain' },
] as const;

export const Default: Story = {
  args: {
    label: 'Country',
    placeholder: 'Start typing…',
    options: countries,
    description: 'Type to filter. Arrow keys browse the list.',
  },
};

export const Small: Story = { args: { ...Default.args, size: 'sm' } };
export const Large: Story = { args: { ...Default.args, size: 'lg' } };

export const Invalid: Story = {
  args: {
    ...Default.args,
    isInvalid: true,
    errorMessage: 'Pick a country from the list.',
  },
};

export const Disabled: Story = { args: { ...Default.args, isDisabled: true } };

/** The ARIA contract: a combobox that reports whether its list is open. */
export const ItIsACombobox: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox');
    await expect(input).toHaveAccessibleName('Country');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await open(canvas);
    const listbox = await overlay().findByRole('listbox');
    await expect(listbox).toBeInTheDocument();
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(input).toHaveAttribute('aria-controls', listbox.id);
  },
};

/** Typing narrows the list; the match is on the label and the description. */
export const TypingFilters: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox');
    await open(canvas);
    await waitFor(async () => {
      await expect(overlay().getAllByRole('option')).toHaveLength(8);
    });
    await userEvent.type(input, 'asia');
    // Japan and Pakistan — matched on the description, not the label.
    await waitFor(async () => {
      await expect(overlay().getAllByRole('option')).toHaveLength(2);
    });
  },
};

/**
 * Locale-aware filtering. "resume" finds "Résumé", which the usual
 * lowercase-and-includes filter does not.
 */
export const AccentsMatch: Story = {
  args: { label: 'Document', options: accented },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox');
    await userEvent.type(input, 'resume');
    await waitFor(async () => {
      const options = overlay().getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Résumé');
    });
  },
};

/**
 * ArrowDown then Enter selects without a pointer, and the real focus stays in
 * the input the whole time — the list is driven by aria-activedescendant.
 */
export const KeyboardSelects: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox');
    input.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(async () => {
      await expect(overlay().getByRole('listbox')).toBeInTheDocument();
    });
    // Real focus never leaves the input; the list is driven by activedescendant.
    await expect(document.activeElement).toBe(input);
    await waitFor(async () => {
      await expect(input).toHaveAttribute('aria-activedescendant');
    });
    await userEvent.keyboard('{Enter}');
    await waitFor(async () => {
      await expect(input).toHaveValue('Australia');
    });
  },
};

/**
 * The empty message is NOT an option. As one it would be counted, focusable
 * and selectable, and picking it would set the field to "No matches".
 */
export const EmptyIsNotAnOption: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox');
    await userEvent.type(input, 'zzzz');
    await waitFor(async () => {
      await expect(overlay().getByText('No matches')).toBeInTheDocument();
    });
    await expect(overlay().queryAllByRole('option')).toHaveLength(0);
  },
};

/** A disabled option is listed and announced, but cannot be selected. */
export const DisabledOptionIsNotSelectable: Story = {
  args: Default.args,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox');
    await open(canvas);
    const norway = await overlay().findByRole('option', { name: /Norway/ });
    await expect(norway).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(norway);
    await expect(input).not.toHaveValue('Norway');
  },
};

/** A form posts the selected KEY, not the visible label. */
export const FormPostsTheKey: Story = {
  render: function Render(args) {
    const [posted, setPosted] = useState('');
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPosted(String(new FormData(e.currentTarget).get('country') ?? ''));
        }}
      >
        <Combobox {...args} name="country" />
        <button type="submit">Submit</button>
        <p data-testid="posted">{posted}</p>
      </form>
    );
  },
  args: Default.args,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox');
    await open(canvas);
    await userEvent.click(
      await overlay().findByRole('option', { name: /Kenya/ }),
    );
    await waitFor(async () => {
      await expect(input).toHaveValue('Kenya');
    });
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    // "ke", not "Kenya".
    await waitFor(async () => {
      await expect(canvas.getByTestId('posted')).toHaveTextContent('ke');
    });
  },
};

/** The disclosure button is not a tab stop — the input already opens the list. */
export const ButtonIsNotATabStop: Story = {
  args: Default.args,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('.ion-combobox__button');
    await expect(button).not.toBeNull();
    await expect(button).toHaveAttribute('tabindex', '-1');
  },
};
