import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { I18nProvider } from 'react-aria';
import { ColorPicker, type ColorPickerProps } from 'ionbase-ui';

const BRAND = [
  { value: '#0B5FFF', label: 'Northwind blue' },
  { value: '#0F766E', label: 'Teal' },
  { value: '#7E22CE', label: 'Plum' },
  { value: '#B91C1C', label: 'Crimson' },
  { value: '#334155', label: 'Graphite' },
];

/** The picker with its value, and every onChangeEnd, written out. */
function Harness({
  initial = '#0B5FFF',
  refuse = false,
  ...props
}: Partial<ColorPickerProps> & { initial?: string | null; refuse?: boolean }) {
  const [value, setValue] = useState<string | null>(initial);
  const [ends, setEnds] = useState<string[]>([]);
  const [changes, setChanges] = useState(0);
  return (
    <>
      <ColorPicker
        label="Brand colour"
        description="The Approve button in approval emails."
        value={value}
        onChange={(v) => {
          setChanges((n) => n + 1);
          if (!refuse) setValue(v);
        }}
        onChangeEnd={(v) => setEnds((e) => [...e, v ?? 'none'])}
        {...props}
      />
      <output data-testid="value">{value ?? 'nothing'}</output>
      <output data-testid="changes">{changes}</output>
      <output data-testid="ends">{ends.join(' ')}</output>
    </>
  );
}

const meta: Meta<typeof ColorPicker> = {
  title: 'Components/ColorPicker',
  component: ColorPicker,
  tags: ['autodocs'],
  // Room for the popover to open downward — see DatePicker's stories.
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '22rem', paddingBottom: '22rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A colour chosen by a person: a brand accent, a label, a chart series. A hex field with a swatch button that opens a saturation and brightness area, a hue strip and any preset swatches.\n\n**The value is `#RRGGBB`**, six hex digits, no alpha, upper case out and either case in. The field takes shorthand as typed input; the props do not, and throw.\n\n**No contrast check.** The picker cannot know what goes on the colour: when text will sit on it, check the pair and pass `isInvalid`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ColorPicker>;

// The popover is portalled to <body> — see DatePicker's stories.
const overlay = () => within(document.body);
const value = (canvas: ReturnType<typeof within>) =>
  canvas.getByTestId('value');
const open = (canvas: ReturnType<typeof within>, name = 'Choose a colour') =>
  userEvent.click(canvas.getByRole('button', { name }));
/** The area's two inputs are both sliders; the one in the tab order is X. */
const areaInputs = (dialog: HTMLElement) =>
  within(dialog)
    .getAllByRole('slider')
    .filter((s) => s.getAttribute('aria-roledescription'));
/** The hue strip's input — named "Hue" in English, by React Aria. */
const hue = (dialog: HTMLElement) =>
  dialog.querySelector<HTMLInputElement>('.ion-color-picker__hue input')!;

export const Default: Story = {
  args: {
    label: 'Brand colour',
    defaultValue: '#0B5FFF',
    description: 'The Approve button in approval emails.',
  },
};

export const Empty: Story = {
  args: { label: 'Brand colour', description: 'None chosen yet.' },
};

export const WithSwatches: Story = {
  args: { ...Default.args, swatches: BRAND },
};

export const Small: Story = { args: { ...Default.args, size: 'sm' } };

export const Large: Story = { args: { ...Default.args, size: 'lg' } };

/** `isInvalid` marks the input for a screen reader, and the error describes it. */
export const Invalid: Story = {
  args: {
    ...Default.args,
    defaultValue: '#FACC15',
    isInvalid: true,
    errorMessage: 'Too light for white text: 1.5:1. Needs 4.5:1.',
  },
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Brand colour' });
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(
      'Too light for white text: 1.5:1. Needs 4.5:1.',
    );
  },
};

export const Disabled: Story = { args: { ...Default.args, isDisabled: true } };

export const ReadOnly: Story = { args: { ...Default.args, isReadOnly: true } };

/**
 * The field shows the hex and the chip shows the colour; the label names the
 * field and the description is linked to it.
 */
export const TheFieldIsTheHex: Story = {
  args: Default.args,
  play: async ({ canvas, canvasElement }) => {
    const field = canvas.getByRole('textbox', { name: 'Brand colour' });
    await expect(field).toHaveValue('#0B5FFF');
    await expect(field).toHaveAccessibleDescription(
      'The Approve button in approval emails.',
    );
    const chip = canvasElement.querySelector('.ion-color-picker__chip')!;
    await expect(getComputedStyle(chip).backgroundColor).toBe(
      'rgb(11, 95, 255)',
    );
    // The button is named for what it does, not by the field's label.
    await expect(
      canvas.getByRole('button', { name: 'Choose a colour' }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
};

/** No colour: an empty field and a struck-through chip, not white. */
export const NoColourIsNotWhite: Story = {
  render: () => <Harness initial={null} />,
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole('textbox', { name: 'Brand colour' }),
    ).toHaveValue('');
    const chip = canvasElement.querySelector('.ion-color-picker__chip')!;
    await expect(chip).toHaveAttribute('data-empty', 'true');
    await expect(getComputedStyle(chip).backgroundImage).toMatch(
      /linear-gradient/,
    );
  },
};

/**
 * A hex typed and committed is the value, in upper case; shorthand is
 * accepted as typing and expanded. onChangeEnd fires once for it.
 */
export const TypingAHexSetsTheValue: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Brand colour' });
    await userEvent.clear(field);
    await userEvent.type(field, '#16a34a{Enter}');
    await expect(value(canvas)).toHaveTextContent('#16A34A');
    await expect(field).toHaveValue('#16A34A');
    await expect(canvas.getByTestId('ends')).toHaveTextContent(/^#16A34A$/);

    await userEvent.clear(field);
    await userEvent.type(field, 'f00{Enter}');
    await expect(value(canvas)).toHaveTextContent('#FF0000');
  },
};

/** Something that is not a colour goes back to the last one on blur. */
export const NonsenseTypedGoesBack: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Brand colour' });
    await userEvent.clear(field);
    await userEvent.type(field, 'blue-ish');
    await userEvent.tab();
    await expect(field).toHaveValue('#0B5FFF');
    await expect(value(canvas)).toHaveTextContent('#0B5FFF');
  },
};

/** Clearing the field clears the value to `null`. */
export const ClearingTheFieldClearsTheValue: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Brand colour' });
    await userEvent.clear(field);
    await userEvent.tab();
    await expect(value(canvas)).toHaveTextContent('nothing');
    await expect(canvas.getByTestId('ends')).toHaveTextContent(/^none$/);
  },
};

/**
 * The button opens a dialog named by the field's label, with focus in the
 * area. The arrow keys move the area's thumb; Escape closes it and focus
 * goes back to the button.
 */
export const OpensWithFocusInTheArea: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog', {
      name: 'Brand colour',
    });
    await expect(
      canvas.getByRole('button', { name: 'Choose a colour' }),
    ).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() =>
      expect(areaInputs(dialog)).toContain(document.activeElement),
    );
    await expect(document.activeElement).toHaveAttribute(
      'aria-roledescription',
      '2D slider',
    );
    // The panel and its thumbs keep their measures although the popover is
    // portalled out of the field that sets them.
    const panel = dialog.querySelector('.ion-color-picker__panel')!;
    await expect(panel.getBoundingClientRect().width).toBe(240);
    const thumb = dialog.querySelector('.ion-color-picker__thumb')!;
    await expect(thumb.getBoundingClientRect().width).toBe(20);
    // Left lowers the saturation, so the blue goes greyer.
    await browserUser.keyboard('{ArrowLeft}');
    await expect(value(canvas)).not.toHaveTextContent('#0B5FFF');
    await expect(canvas.getByTestId('ends').textContent).toMatch(
      /^#[0-9A-F]{6}$/,
    );

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(overlay().queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        canvas.getByRole('button', { name: 'Choose a colour' }),
      ),
    );
  },
};

/** Tab moves from the area to the hue strip to the swatches, and stays in. */
export const TabStaysInThePopover: Story = {
  render: () => <Harness swatches={BRAND} />,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    await waitFor(() =>
      expect(areaInputs(dialog)).toContain(document.activeElement),
    );
    await browserUser.keyboard('{Tab}');
    await expect(document.activeElement).toBe(hue(dialog));
    await browserUser.keyboard('{Tab}');
    await expect(document.activeElement).toHaveAttribute('type', 'radio');
    await browserUser.keyboard('{Tab}');
    await expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
  },
};

/**
 * Dragged to black, the hue is kept. Hex has no hue for black, so a picker
 * that took its colour back from hex would jump the strip to red, and the
 * next step up the area would come back red instead of blue.
 */
export const BlackKeepsItsHue: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    await waitFor(() =>
      expect(areaInputs(dialog)).toContain(document.activeElement),
    );
    const before = hue(dialog).value;
    await expect(Number(before)).toBeGreaterThan(200);
    // Down, a page at a time, to the bottom: brightness 0.
    for (let i = 0; i < 12; i++) await browserUser.keyboard('{PageDown}');
    await expect(value(canvas)).toHaveTextContent('#000000');
    await expect(hue(dialog)).toHaveValue(before);
    await browserUser.keyboard('{PageUp}');
    // Blue, not red: more blue than red in what came back.
    const hex = value(canvas).textContent!;
    const [r, , b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    await expect(b).toBeGreaterThan(r);
    await userEvent.keyboard('{Escape}');
  },
};

/** The hue strip changes the hue and keeps saturation and brightness. */
export const TheHueStripChangesTheHue: Story = {
  render: () => <Harness initial="#FF0000" />,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    const strip = hue(dialog);
    await expect(strip).toHaveAccessibleName('Hue');
    strip.focus();
    await expect(strip).toHaveValue('0');
    for (let i = 0; i < 12; i++) await browserUser.keyboard('{ArrowRight}');
    await expect(strip).toHaveValue('12');
    await expect(value(canvas)).toHaveTextContent('#FF3300');
    await userEvent.keyboard('{Escape}');
  },
};

/**
 * Presets are one radio group, each named by its label. Picking one sets
 * the value and ends a change; the arrow keys move and pick; a colour off
 * every preset leaves none checked.
 */
export const SwatchesAreOneRadioGroup: Story = {
  render: () => <Harness swatches={BRAND} />,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    const group = within(dialog).getByRole('radiogroup', {
      name: 'Suggested colours',
    });
    await expect(
      within(group).getByRole('radio', { name: 'Northwind blue' }),
    ).toBeChecked();
    // Pressed as a person does, on the swatch; the radio in it takes focus,
    // so the arrow keys and Escape work from there.
    const plum = within(group).getByRole('radio', { name: 'Plum' });
    await browserUser.click(plum.closest('label')!);
    await expect(document.activeElement).toBe(plum);
    await expect(value(canvas)).toHaveTextContent('#7E22CE');
    await expect(canvas.getByTestId('ends')).toHaveTextContent(/^#7E22CE$/);
    await browserUser.keyboard('{ArrowRight}');
    await expect(value(canvas)).toHaveTextContent('#B91C1C');
    await expect(
      within(group).getByRole('radio', { name: 'Crimson' }),
    ).toBeChecked();
    // The chosen swatch is ringed, not only coloured.
    const chosen = within(group)
      .getByRole('radio', { name: 'Crimson' })
      .closest('label')!;
    await expect(getComputedStyle(chosen).boxShadow).not.toBe('none');

    hue(dialog).focus();
    await browserUser.keyboard('{ArrowRight}');
    await expect(
      within(group)
        .getAllByRole('radio')
        .some((r) => (r as HTMLInputElement).checked),
    ).toBe(false);
    await userEvent.keyboard('{Escape}');
  },
};

/** A preset with no label is named by its colour, in the reader's language. */
export const AnUnlabelledSwatchIsNamedByItsColour: Story = {
  render: () => <Harness swatches={['#0B5FFF', '#FF0000']} />,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    const names = within(dialog)
      .getAllByRole('radio')
      .map((r) => r.getAttribute('aria-label'));
    await expect(names).toEqual(['vibrant cyan blue', 'vibrant red']);
    await userEvent.keyboard('{Escape}');
  },
};

/**
 * onChange fires on every step, onChangeEnd once a step is finished — a
 * key step is one of each.
 */
export const OnChangeEndIsOncePerChange: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    hue(dialog).focus();
    await browserUser.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    await expect(canvas.getByTestId('changes')).toHaveTextContent('3');
    await expect(
      canvas.getByTestId('ends').textContent!.split(' '),
    ).toHaveLength(3);
    await userEvent.keyboard('{Escape}');
  },
};

/** A caller that refuses the change keeps its value, and the field shows it. */
export const ARefusedChangeIsUndone: Story = {
  render: () => <Harness refuse />,
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Brand colour' });
    await userEvent.clear(field);
    await userEvent.type(field, '#16A34A{Enter}');
    await expect(canvas.getByTestId('changes')).toHaveTextContent('1');
    await expect(field).toHaveValue('#0B5FFF');
  },
};

/** `id` goes on the input, where an error summary's link lands, and the label follows it. */
export const IdIsTheInputs: Story = {
  render: () => <Harness id="brand-colour" />,
  play: async ({ canvas, canvasElement }) => {
    const field = canvas.getByRole('textbox', { name: 'Brand colour' });
    await expect(field).toHaveAttribute('id', 'brand-colour');
    await expect(canvasElement.querySelector('label')).toHaveAttribute(
      'for',
      'brand-colour',
    );
  },
};

/** A form posts the hex. */
export const FormPostsTheHex: Story = {
  render: function Render() {
    const [posted, setPosted] = useState('');
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPosted(String(new FormData(e.currentTarget).get('brand') ?? ''));
        }}
      >
        <ColorPicker label="Brand colour" name="brand" defaultValue="#0b5fff" />
        <button type="submit">Submit</button>
        <p data-testid="posted">{posted}</p>
      </form>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await expect(canvas.getByTestId('posted')).toHaveTextContent(/^#0B5FFF$/);
  },
};

/** A name, rgb() or shorthand throws rather than rendering nothing. */
export const AMalformedValueThrows: Story = {
  render: function Render() {
    const thrown = (props: Partial<ColorPickerProps>) => {
      try {
        // Called as a function: the check runs before any hook would.
        ColorPicker({ label: 'Broken', ...props });
        return 'no error';
      } catch (e) {
        return (e as Error).message;
      }
    };
    return (
      <>
        <p data-testid="name">{thrown({ value: 'red' })}</p>
        <p data-testid="short">{thrown({ value: '#f00' })}</p>
        <p data-testid="rgb">{thrown({ defaultValue: 'rgb(255, 0, 0)' })}</p>
      </>
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('name')).toHaveTextContent(
      /^value: expected a #RRGGBB string/,
    );
    await expect(canvas.getByTestId('short')).toHaveTextContent(
      /^value: expected a #RRGGBB string/,
    );
    await expect(canvas.getByTestId('rgb')).toHaveTextContent(
      /^defaultValue: expected a #RRGGBB string/,
    );
  },
};

/** Disabled and read-only fields do not open. */
export const DisabledAndReadOnlyDoNotOpen: Story = {
  render: () => (
    <>
      <ColorPicker label="Disabled" defaultValue="#0B5FFF" isDisabled />
      <ColorPicker label="Read only" defaultValue="#0B5FFF" isReadOnly />
    </>
  ),
  play: async ({ canvas }) => {
    const [a, b] = canvas.getAllByRole('button', { name: 'Choose a colour' });
    await expect(a).toBeDisabled();
    await expect(b).toBeDisabled();
    await expect(
      canvas.getByRole('textbox', { name: 'Read only' }),
    ).toHaveAttribute('readonly');
    await expect(
      canvas.getByRole('textbox', { name: 'Disabled' }),
    ).toBeDisabled();
  },
};

/** `labels` name the button and the presets. */
export const LabelsNameTheButtonAndTheSwatches: Story = {
  render: () => (
    <Harness
      swatches={BRAND}
      labels={{ picker: 'Pick a brand colour', swatches: 'Brand palette' }}
    />
  ),
  play: async ({ canvas }) => {
    await open(canvas, 'Pick a brand colour');
    const dialog = await overlay().findByRole('dialog');
    await expect(
      within(dialog).getByRole('radiogroup', { name: 'Brand palette' }),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

/** With no visible label, `aria-label` names the field and the dialog. */
export const AriaLabelNamesTheField: Story = {
  render: () => <Harness label={undefined} aria-label="Label colour" />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('textbox', { name: 'Label colour' }),
    ).toBeVisible();
    await open(canvas);
    await expect(
      await overlay().findByRole('dialog', { name: 'Label colour' }),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

/** Right to left: the hue strip runs from the right, and the arrows follow it. */
export const RightToLeft: Story = {
  render: () => (
    <I18nProvider locale="ar-EG">
      <div dir="rtl">
        <Harness initial="#FF0000" />
      </div>
    </I18nProvider>
  ),
  play: async ({ canvas }) => {
    await open(canvas);
    const dialog = await overlay().findByRole('dialog');
    const strip = dialog.querySelector('.ion-color-picker__hue')!;
    await expect(getComputedStyle(strip).backgroundImage).toMatch(
      /^linear-gradient\(to left/,
    );
    const thumb = strip.querySelector('.ion-color-picker__thumb')!;
    const s = strip.getBoundingClientRect();
    // Hue 0 sits at the right-hand end.
    await expect(
      Math.abs(thumb.getBoundingClientRect().right - s.right),
    ).toBeLessThan(thumb.getBoundingClientRect().width);
    hue(dialog).focus();
    await browserUser.keyboard('{ArrowLeft}');
    await expect(hue(dialog)).toHaveValue('1');
    await userEvent.keyboard('{Escape}');
  },
};
