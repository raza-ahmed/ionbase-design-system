import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
// Real browser input: a press anywhere on the tile has to reach the label.
import { userEvent } from 'vitest/browser';
import {
  CheckboxGroup,
  RadioGroup,
  SelectableTile,
  type SelectableTileProps,
} from 'ionbase-ui';

const PLANS: SelectableTileProps[] = [
  {
    value: 'starter',
    title: 'Starter',
    description: 'Up to 3 agents, community support.',
    children: 'Free',
  },
  {
    value: 'team',
    title: 'Team',
    description: 'Up to 20 agents and shared approvals.',
    children: '€49 a month',
  },
  {
    value: 'enterprise',
    title: 'Enterprise',
    description: 'Unlimited agents, SSO and an audit log.',
    children: 'Talk to us',
  },
];

function Plans(props: { width?: number; isInvalid?: boolean }) {
  const [plan, setPlan] = useState('team');
  return (
    <div style={{ width: props.width ?? 720 }}>
      <RadioGroup
        label="Plan"
        value={plan}
        onChange={setPlan}
        isInvalid={props.isInvalid}
        errorMessage={props.isInvalid ? 'Choose a plan.' : undefined}
      >
        {PLANS.map((p) => (
          <SelectableTile key={p.value} {...p} />
        ))}
      </RadioGroup>
      <output data-testid="plan">{plan}</output>
    </div>
  );
}

function Schedules() {
  const [days, setDays] = useState<string[]>(['mon']);
  return (
    <div style={{ width: 720 }}>
      <CheckboxGroup label="Run on" value={days} onChange={setDays}>
        <SelectableTile
          value="mon"
          title="Mondays"
          description="Before the weekly review."
        />
        <SelectableTile
          value="wed"
          title="Wednesdays"
          description="Mid-week catch-up."
        />
        <SelectableTile
          value="fri"
          title="Fridays"
          description="End of week, after the last deploy."
          isDisabled
        />
      </CheckboxGroup>
      <output data-testid="days">{days.join(',')}</output>
    </div>
  );
}

const meta: Meta<typeof SelectableTile> = {
  title: 'Components/SelectableTile',
  component: SelectableTile,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A choice the size of a card. Inside a RadioGroup it is a real Radio; inside a CheckboxGroup, or alone, a real Checkbox. Its label is stretched over the tile, so the whole card is the target; the title is the name and the description is read after it. Nothing inside a tile may be interactive.',
      },
    },
  },
  render: () => <Plans />,
};

export default meta;
type Story = StoryObj<typeof SelectableTile>;

export const RadioTiles: Story = {};
export const CheckboxTiles: Story = { render: () => <Schedules /> };
export const Invalid: Story = { render: () => <Plans isInvalid /> };

// ------------------------------------------------------------------ tests

const selectSpy = fn();

const tile = (el: HTMLElement, name: string) =>
  [...el.querySelectorAll<HTMLElement>('.ion-tile')].find((t) =>
    t.textContent?.includes(name),
  )!;

/**
 * In a RadioGroup the tiles are radios named by their titles, sharing one
 * name, each described by its sentence and detail.
 */
export const TheyAreRadiosNamedByTitle: Story = {
  play: async ({ canvas }) => {
    const radios = canvas.getAllByRole('radio');
    await expect(radios.map((r) => r.getAttribute('aria-label') ?? '')).toEqual(
      ['', '', ''],
    );
    await expect(radios[1]).toHaveAccessibleName('Team');
    await expect(radios[1]).toHaveAccessibleDescription(
      'Up to 20 agents and shared approvals. €49 a month',
    );
    await expect(
      new Set(radios.map((r) => (r as HTMLInputElement).name)).size,
    ).toBe(1);
    await expect(radios[1]).toBeChecked();
  },
};

/** A press anywhere on the tile — here, on its price — chooses it. */
export const TheWholeTileIsTheTarget: Story = {
  play: async ({ canvas, canvasElement }) => {
    // Near the bottom corner, over the price: nowhere near the radio itself.
    const enterprise = tile(canvasElement, 'Enterprise');
    const { width, height } = enterprise.getBoundingClientRect();
    await userEvent.click(enterprise, {
      position: { x: width - 12, y: height - 12 },
    });
    await expect(
      canvas.getByRole('radio', { name: 'Enterprise' }),
    ).toBeChecked();
    await expect(canvas.getByTestId('plan')).toHaveTextContent('enterprise');
  },
};

/** Arrow keys move between them, as between any radios. */
export const ArrowKeysMoveBetweenThem: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('radio', { name: 'Team' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(canvas.getByRole('radio', { name: 'Enterprise' })).toHaveFocus(),
    );
    await expect(canvas.getByTestId('plan')).toHaveTextContent('enterprise');
  },
};

/**
 * In a CheckboxGroup they are checkboxes: several can be ticked, and Space
 * toggles the focused one. A disabled tile cannot be.
 */
export const InACheckboxGroupTheyAreCheckboxes: Story = {
  ...CheckboxTiles,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(tile(canvasElement, 'Wednesdays'));
    await expect(canvas.getByTestId('days')).toHaveTextContent('mon,wed');
    canvas.getByRole('checkbox', { name: 'Mondays' }).focus();
    await userEvent.keyboard(' ');
    await expect(canvas.getByTestId('days')).toHaveTextContent('wed');
    const friday = canvas.getByRole('checkbox', { name: 'Fridays' });
    await expect(friday).toBeDisabled();
    await userEvent.click(tile(canvasElement, 'Fridays'), { force: true });
    await expect(friday).not.toBeChecked();
  },
};

/** Alone, a tile is a checkbox with its own state. */
export const AloneItIsACheckbox: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <SelectableTile
        value="digest"
        title="Weekly digest"
        description="A Monday summary of runs and spend."
        onSelectionChange={selectSpy}
      />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    selectSpy.mockClear();
    const digest = tile(canvasElement, 'Weekly digest');
    const { width, height } = digest.getBoundingClientRect();
    await userEvent.click(digest, {
      position: { x: width - 12, y: height - 12 },
    });
    await expect(selectSpy).toHaveBeenCalledWith(true);
    await expect(
      canvas.getByRole('checkbox', { name: 'Weekly digest' }),
    ).toBeChecked();
  },
};

/**
 * Selected is more than a colour: the border doubles, drawn inside so the
 * content does not move, and the indicator is filled.
 */
export const SelectedIsMoreThanAColour: Story = {
  play: async ({ canvasElement }) => {
    const selected = tile(canvasElement, 'Team');
    const other = tile(canvasElement, 'Starter');
    await expect(getComputedStyle(selected).boxShadow).not.toBe('none');
    await expect(getComputedStyle(other).boxShadow).toBe('none');
    await expect(selected.getBoundingClientRect().height).toBe(
      other.getBoundingClientRect().height,
    );
    const dot = (t: HTMLElement) =>
      getComputedStyle(t.querySelector('.ion-radio__dot')!).opacity;
    await expect(dot(selected)).not.toBe(dot(other));
  },
};

/** The keyboard focus ring goes round the whole tile. */
export const FocusRingsTheTile: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(tile(canvasElement, 'Team'));
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(canvas.getByRole('radio', { name: 'Starter' })).toHaveFocus(),
    );
    await expect(
      getComputedStyle(tile(canvasElement, 'Starter')).outlineStyle,
    ).toBe('solid');
    await expect(
      getComputedStyle(tile(canvasElement, 'Team')).outlineStyle,
    ).toBe('none');
  },
};

/** The group's error is read on each tile, and the tiles take the error border. */
export const TheGroupErrorReachesEachTile: Story = {
  ...Invalid,
  play: async ({ canvas, canvasElement }) => {
    const radio = canvas.getByRole('radio', { name: 'Starter' });
    await expect(radio).toHaveAccessibleDescription(
      /Up to 3 agents, community support\..*Choose a plan\./,
    );
    const color = getComputedStyle(tile(canvasElement, 'Starter')).borderColor;
    const ok = await (async () => {
      const other = document.createElement('div');
      other.className = 'ion-tile';
      document.body.append(other);
      const plain = getComputedStyle(other).borderColor;
      other.remove();
      return plain;
    })();
    await expect(color).not.toBe(ok);
  },
};

/** The tiles wrap into a grid: side by side when there is room, one column on a phone. */
export const TheyWrapIntoAGrid: Story = {
  render: () => (
    <>
      <div data-testid="wide">
        <Plans width={760} />
      </div>
      <div data-testid="narrow">
        <Plans width={300} />
      </div>
    </>
  ),
  play: async ({ canvas }) => {
    const tops = (id: string) =>
      [...canvas.getByTestId(id).querySelectorAll('.ion-tile')].map(
        (t) => t.getBoundingClientRect().top,
      );
    const wide = tops('wide');
    await expect(new Set(wide).size).toBe(1);
    const narrow = tops('narrow');
    await expect(new Set(narrow).size).toBe(3);
    const narrowTile = canvas
      .getByTestId('narrow')
      .querySelector('.ion-tile') as HTMLElement;
    await expect(narrowTile.getBoundingClientRect().width).toBeLessThanOrEqual(
      300,
    );
  },
};

/** A form submits the chosen value, as a native radio's. */
export const AFormSubmitsIt: Story = {
  render: () => {
    function Form() {
      const [sent, setSent] = useState('');
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(String(new FormData(e.currentTarget).get('plan')));
          }}
        >
          <RadioGroup label="Plan" name="plan" defaultValue="starter">
            {PLANS.map((p) => (
              <SelectableTile key={p.value} {...p} />
            ))}
          </RadioGroup>
          <button type="submit">Continue</button>
          <output data-testid="sent">{sent}</output>
        </form>
      );
    }
    return <Form />;
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(tile(canvasElement, 'Team'));
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(canvas.getByTestId('sent')).toHaveTextContent('team');
  },
};

/** The icon is decoration: hidden, so the name is only the title. */
export const TheIconIsHidden: Story = {
  render: () => (
    <SelectableTile
      value="x"
      title="Nightly"
      icon={<svg data-testid="icon" width="16" height="16" />}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('icon').parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await expect(canvas.getByRole('checkbox')).toHaveAccessibleName('Nightly');
  },
};
