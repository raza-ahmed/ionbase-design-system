import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { MenuItem, SplitButton, type SplitButtonProps } from 'ionbase-ui';

/** A split button that writes what it did, so a test can read it. */
function Harness(props: Partial<SplitButtonProps>) {
  const [did, setDid] = useState('');
  return (
    <div>
      <SplitButton
        label="Save"
        onPress={() => setDid('saved')}
        onAction={(key) => setDid(`chose ${String(key)}`)}
        {...props}
      >
        <MenuItem key="draft">Save as draft</MenuItem>
        <MenuItem key="template">Save as template</MenuItem>
      </SplitButton>
      <output data-testid="did">{did}</output>
    </div>
  );
}

const meta: Meta<typeof SplitButton> = {
  title: 'Components/SplitButton',
  component: SplitButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'One main action with a menu of variations on it — Save, and Save as draft. Two Buttons in a `group`, two tab stops: the main one by its label, the menu one as "More options, Save", so several split buttons on a page have distinct menu buttons. The main half always does the same thing; it never becomes the last alternative chosen.',
      },
    },
  },
  render: () => <Harness />,
};

export default meta;
type Story = StoryObj<typeof SplitButton>;

export const Default: Story = {};
export const Secondary: Story = {
  render: () => <Harness variant="secondary" />,
};
export const PrimaryNeutral: Story = {
  render: () => <Harness variant="primary-neutral" />,
};
export const Small: Story = { render: () => <Harness size="sm" /> };

// ------------------------------------------------------------------ tests

const body = () => within(document.body);
const box = (el: Element) => el.getBoundingClientRect();
const main = (c: ReturnType<typeof within>) =>
  c.getByRole('button', { name: 'Save' });
const menuBtn = (c: ReturnType<typeof within>) =>
  c.getByRole('button', { name: 'More options Save' });

/**
 * A group named by the action, holding two buttons: the action, and a menu
 * button named for itself and the action it belongs to.
 */
export const IsAGroupOfTwoNamedButtons: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('group')).toHaveAccessibleName('Save');
    await expect(canvas.getAllByRole('button')).toHaveLength(2);
    const m = menuBtn(canvas);
    await expect(m).toHaveAttribute('aria-haspopup', 'true');
    await expect(m).toHaveAttribute('aria-expanded', 'false');
    await expect(main(canvas)).not.toHaveAttribute('aria-haspopup');
  },
};

/** Two split buttons, two distinct menu buttons. */
export const MenuButtonsAreDistinct: Story = {
  render: () => (
    <>
      <Harness />
      <Harness label="Run now" />
    </>
  ),
  play: async ({ canvas }) => {
    await expect(menuBtn(canvas)).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'More options Run now' }),
    ).toBeInTheDocument();
  },
};

export const MenuLabelIsTranslatable: Story = {
  render: () => <Harness label="Speichern" menuLabel="Weitere Optionen" />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Weitere Optionen Speichern' }),
    ).toBeInTheDocument();
  },
};

/** The main half does the action and opens nothing. */
export const MainDoesTheAction: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(main(canvas));
    await expect(canvas.getByTestId('did')).toHaveTextContent('saved');
    await expect(body().queryByRole('menu')).toBeNull();
  },
};

/**
 * The menu half opens the alternatives; choosing one reports its key, closes
 * the menu and returns focus to the menu button. The main half is unchanged.
 */
export const MenuChoosesAnAlternative: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(menuBtn(canvas));
    const menu = await body().findByRole('menu');
    // Named by its trigger, as every MenuTrigger's menu is.
    await expect(menu).toHaveAttribute('aria-labelledby', menuBtn(canvas).id);
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Save as draft' }),
    );
    await expect(canvas.getByTestId('did')).toHaveTextContent('chose draft');
    await waitFor(() => expect(body().queryByRole('menu')).toBeNull());
    await expect(menuBtn(canvas)).toHaveFocus();
    await userEvent.click(main(canvas));
    await expect(canvas.getByTestId('did')).toHaveTextContent('saved');
  },
};

/** ↓ on the menu button opens the menu on its first item. */
export const ArrowDownOpensOnTheFirstItem: Story = {
  play: async ({ canvas }) => {
    menuBtn(canvas).focus();
    await userEvent.keyboard('{ArrowDown}');
    const first = await body().findByRole('menuitem', {
      name: 'Save as draft',
    });
    await waitFor(() => expect(first).toHaveFocus());
  },
};

/** Two tab stops, main first. */
export const TwoTabStops: Story = {
  render: () => (
    <>
      <button type="button">Before</button>
      <Harness />
      <button type="button">After</button>
    </>
  ),
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: 'Before' }).focus();
    await browserUser.keyboard('{Tab}');
    await expect(main(canvas)).toHaveFocus();
    await browserUser.keyboard('{Tab}');
    await expect(menuBtn(canvas)).toHaveFocus();
    await browserUser.keyboard('{Tab}');
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus();
  },
};

/**
 * Drawn as one: same height, one shared border at the seam, square inner
 * corners, and a square menu half.
 */
export const DrawnAsOneButton: Story = {
  play: async ({ canvas }) => {
    const [a, b] = [main(canvas), menuBtn(canvas)];
    await expect(Math.round(box(a).height)).toBe(Math.round(box(b).height));
    await expect(Math.round(box(b).width)).toBe(Math.round(box(b).height));
    await expect(box(a).right - box(b).left).toBeCloseTo(1, 0);
    await expect(getComputedStyle(a).borderStartEndRadius).toBe('0px');
    await expect(getComputedStyle(b).borderStartStartRadius).toBe('0px');
    await expect(getComputedStyle(a).borderStartStartRadius).not.toBe('0px');
  },
};

export const SmallIsSmall: Story = {
  ...Small,
  play: async ({ canvas }) => {
    const b = menuBtn(canvas);
    await expect(Math.round(box(b).height)).toBe(32);
    await expect(Math.round(box(b).width)).toBe(32);
  },
};

/** The focused half is lifted, so its ring is not cut by its neighbour. */
export const FocusedHalfIsLifted: Story = {
  play: async ({ canvas }) => {
    main(canvas).focus();
    await browserUser.keyboard('{Tab}');
    await expect(menuBtn(canvas)).toHaveFocus();
    await expect(getComputedStyle(menuBtn(canvas)).zIndex).toBe('1');
    await expect(getComputedStyle(main(canvas)).zIndex).not.toBe('1');
  },
};

export const DisabledDisablesBoth: Story = {
  render: () => <Harness isDisabled />,
  play: async ({ canvas }) => {
    await expect(main(canvas)).toBeDisabled();
    await expect(menuBtn(canvas)).toBeDisabled();
  },
};

/** The alternatives can be unavailable while the action is not. */
export const MenuDisabledLeavesTheAction: Story = {
  render: () => <Harness isMenuDisabled />,
  play: async ({ canvas }) => {
    await expect(menuBtn(canvas)).toBeDisabled();
    await userEvent.click(main(canvas));
    await expect(canvas.getByTestId('did')).toHaveTextContent('saved');
  },
};

export const DisabledKeysDisableItems: Story = {
  render: () => <Harness disabledKeys={['template']} />,
  play: async ({ canvas }) => {
    await userEvent.click(menuBtn(canvas));
    const item = await body().findByRole('menuitem', {
      name: 'Save as template',
    });
    await expect(item).toHaveAttribute('aria-disabled', 'true');
  },
};

/** `type="submit"`: the main half submits its form; the menu half does not. */
export const MainCanSubmitAForm: Story = {
  render: () => {
    const [sent, setSent] = useState(0);
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSent((n) => n + 1);
        }}
      >
        <SplitButton label="Save" type="submit">
          <MenuItem key="draft">Save as draft</MenuItem>
        </SplitButton>
        <output data-testid="sent">{sent}</output>
      </form>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(menuBtn(canvas));
    await expect(canvas.getByTestId('sent')).toHaveTextContent('0');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(main(canvas));
    await expect(canvas.getByTestId('sent')).toHaveTextContent('1');
  },
};
