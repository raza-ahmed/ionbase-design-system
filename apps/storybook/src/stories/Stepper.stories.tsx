import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { Stepper, StepperStep } from 'ionbase-ui';

const meta: Meta<typeof Stepper> = {
  title: 'Components/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Where the user is in a task that has an order.\n\n**Not Tabs.** The `tablist` role announces peers that can be visited in any order, which is the opposite of a wizard. This is an ordered list.\n\n**Position and status are text.** Every step renders "Step 2 of 5" and its status as visually hidden text, and `complete` and `error` differ in glyph shape as well as colour.\n\n**Only visited steps are links.** `href` and `onPress` are ignored on the current step and on `incomplete` steps — jumping forward past unanswered steps is what a wizard exists to prevent.\n\n**`status` and `isCurrent` are separate.** A user who goes Back to step 1 is on a step that is both current and complete.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Stepper>;

const Checkout = ({
  onPress,
  ...props
}: React.ComponentProps<typeof Stepper> & { onPress?: () => void }) => (
  <Stepper label="Checkout progress" {...props}>
    <StepperStep status="complete" onPress={onPress} description="Signed in">
      Account
    </StepperStep>
    <StepperStep status="complete" onPress={onPress} description="2-day">
      Shipping
    </StepperStep>
    <StepperStep isCurrent description="Card or bank">
      Payment
    </StepperStep>
    <StepperStep onPress={onPress}>Review</StepperStep>
  </Stepper>
);

export const Default: Story = { render: (args) => <Checkout {...args} /> };

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => <Checkout {...args} />,
};

/** A rejected step keeps its place and shows an exclamation, not only red. */
export const WithError: Story = {
  render: (args) => (
    <Stepper {...args}>
      <StepperStep status="complete">Account</StepperStep>
      <StepperStep status="error" isCurrent description="Postcode not found">
        Shipping
      </StepperStep>
      <StepperStep>Payment</StepperStep>
      <StepperStep>Review</StepperStep>
    </Stepper>
  ),
};

/** Below 40rem only the current label stays visible; the rest stay readable. */
export const Narrow: Story = {
  render: (args) => (
    <div style={{ maxWidth: '20rem' }}>
      <Checkout {...args} />
    </div>
  ),
};

/** A working wizard: Back and Next move the current step; done steps link back. */
export const Interactive: Story = {
  render: function Render(args) {
    const names = ['Account', 'Shipping', 'Payment', 'Review'];
    const [current, setCurrent] = useState(0);
    const [done, setDone] = useState(0);
    return (
      <div style={{ display: 'grid', gap: '24px' }}>
        <Stepper {...args}>
          {names.map((name, i) => (
            <StepperStep
              key={name}
              isCurrent={i === current}
              status={i < done ? 'complete' : 'incomplete'}
              onPress={() => setCurrent(i)}
            >
              {name}
            </StepperStep>
          ))}
        </Stepper>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setCurrent(current - 1)}
          >
            Back
          </button>
          <button
            type="button"
            disabled={current === names.length - 1}
            onClick={() => {
              setDone(Math.max(done, current + 1));
              setCurrent(current + 1);
            }}
          >
            Next
          </button>
        </div>
      </div>
    );
  },
};

/** Position and status are text, derived from the children. */
export const PositionIsStatedInText: Story = {
  render: (args) => <Checkout {...args} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('list')).toHaveAccessibleName(
      'Checkout progress',
    );
    const steps = canvas.getAllByRole('listitem');
    await expect(steps).toHaveLength(4);
    await expect(steps[0]).toHaveTextContent('Step 1 of 4: Account');
    await expect(steps[0]).toHaveTextContent('Completed');
    await expect(steps[2]).toHaveTextContent('Step 3 of 4: Payment');
    await expect(steps[2]).toHaveTextContent('Current step');
    await expect(steps[3]).toHaveTextContent('Not started');
  },
};

/** Exactly one step is current, and it carries aria-current="step". */
export const CurrentStepIsMarked: Story = {
  render: (args) => <Checkout {...args} />,
  play: async ({ canvasElement }) => {
    const current = canvasElement.querySelectorAll('[aria-current="step"]');
    await expect(current).toHaveLength(1);
    await expect(current[0]).toHaveTextContent('Payment');
  },
};

const pressed = fn();

/**
 * The contract that matters: complete steps are buttons, while the current
 * step and the incomplete step are text even though Review was given onPress.
 */
export const OnlyVisitedStepsAreInteractive: Story = {
  render: (args) => <Checkout {...args} onPress={pressed} />,
  play: async ({ canvas }) => {
    pressed.mockClear();
    await expect(canvas.getAllByRole('button')).toHaveLength(2);
    await expect(canvas.queryByRole('button', { name: /Review/ })).toBeNull();
    await expect(canvas.queryByRole('button', { name: /Payment/ })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: /Shipping/ }));
    await expect(pressed).toHaveBeenCalledTimes(1);
  },
};

/** An href turns a visited step into a link, and nothing else. */
export const VisitedStepsCanBeLinks: Story = {
  render: (args) => (
    <Stepper {...args}>
      <StepperStep status="complete" href="#account">
        Account
      </StepperStep>
      <StepperStep isCurrent href="#shipping">
        Shipping
      </StepperStep>
      <StepperStep href="#payment">Payment</StepperStep>
    </Stepper>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('link')).toHaveLength(1);
    await expect(canvas.getByRole('link')).toHaveAttribute('href', '#account');
  },
};

/** Error is a shape as well as a colour, and is named in text. */
export const ErrorIsNotColourAlone: Story = {
  render: (args) => (
    <Stepper {...args}>
      <StepperStep status="complete">Account</StepperStep>
      <StepperStep status="error" isCurrent>
        Shipping
      </StepperStep>
    </Stepper>
  ),
  play: async ({ canvas }) => {
    const [complete, error] = canvas.getAllByRole('listitem');
    await expect(error).toHaveTextContent('Current step, has errors');
    const glyph = (li: HTMLElement) =>
      li.querySelector('.ion-stepper__indicator svg')?.innerHTML;
    await expect(glyph(error)).toBeTruthy();
    await expect(glyph(error)).not.toBe(glyph(complete));
  },
};
