import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { FileUpload } from 'ionbase-ui';
import type { RejectedFile } from 'ionbase-ui';

const meta: Meta<typeof FileUpload> = {
  title: 'Components/FileUpload',
  component: FileUpload,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A drop target wrapped around a real file input.\n\n**The input is the control; the drop zone is decoration.** The usual build of this component is a `<div>` with drag handlers and an `onClick` that calls `input.click()`. That version has no accessible name, no tab stop, no form participation and no keyboard path. Here the file input is a real, focusable, labelled control, clipped to one pixel rather than `display: none` — which would remove it from the tab order and the accessibility tree entirely. Drag-and-drop is layered on top, and every path it offers is reachable without it.\n\n**The zone is a `<label>`**, which is what makes clicking anywhere on it open the picker — no `onClick`, no ref, and it works without scripting.\n\n**Validation is advisory, not security.** `accept` and `maxSize` are checked here so the user finds out immediately rather than after an upload. A browser does not enforce `accept` on drop, and every platform picker offers an "All files" escape, so the server must check again.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof FileUpload>;

const file = (name: string, size: number, type = 'image/png') => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

export const Default: Story = {
  args: {
    label: 'Attachments',
    hint: 'PNG or JPG, up to 5 MB',
    accept: 'image/png,image/jpeg',
    maxSize: 5_000_000,
    multiple: true,
  },
};

export const Small: Story = {
  args: { ...Default.args, size: 'sm', label: 'Logo', multiple: false },
};

export const Invalid: Story = {
  args: {
    ...Default.args,
    isInvalid: true,
    errorMessage: 'At least one attachment is required.',
  },
};

export const Disabled: Story = {
  args: { ...Default.args, isDisabled: true },
};

/**
 * The contract that matters. The control is a real file input with an
 * accessible name, reachable by keyboard — not a div with a click handler.
 */
export const TheControlIsARealInput: Story = {
  args: Default.args,
  play: async ({ canvasElement }) => {
    const input =
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]');
    await expect(input).not.toBeNull();
    await expect(input!.disabled).toBe(false);
    // Not display:none — that would remove it from the tab order entirely.
    await expect(getComputedStyle(input!).display).not.toBe('none');
    input!.focus();
    await expect(document.activeElement).toBe(input);
  },
};

/** The zone is a label for the input, so a click anywhere opens the picker. */
export const TheZoneIsALabel: Story = {
  args: Default.args,
  play: async ({ canvasElement }) => {
    const input =
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    const target = canvasElement.querySelector<HTMLLabelElement>(
      '.ion-file-upload__target',
    );
    await expect(target).not.toBeNull();
    await expect(target!.htmlFor).toBe(input.id);
  },
};

/** Files over `maxSize` are reported rather than silently dropped. */
export const OversizeIsRejected: Story = {
  render: function Render(args) {
    const [files, setFiles] = useState<File[]>([]);
    const [rejected, setRejected] = useState<RejectedFile[]>([]);
    return (
      <>
        <FileUpload
          {...args}
          files={files}
          onChange={setFiles}
          onReject={setRejected}
        />
        <p data-testid="rejected">{rejected.map((r) => r.message).join(' ')}</p>
      </>
    );
  },
  args: { ...Default.args, maxSize: 1000 },
  play: async ({ canvas, canvasElement }) => {
    const input =
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, [
      file('small.png', 500),
      file('huge.png', 9_000_000),
    ]);
    await waitFor(async () => {
      await expect(canvas.getByText('small.png')).toBeInTheDocument();
    });
    await expect(canvas.queryByText('huge.png')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('rejected')).toHaveTextContent(
      'over the 1.0 kB limit',
    );
  },
};

/**
 * `maxFiles` counts against what is already held, so an over-limit batch is
 * partly accepted rather than wholly refused.
 */
export const MaxFilesAcceptsWhatFits: Story = {
  render: OversizeIsRejected.render,
  args: { ...Default.args, maxSize: undefined, maxFiles: 2 },
  play: async ({ canvas, canvasElement }) => {
    const input =
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, [
      file('a.png', 10),
      file('b.png', 10),
      file('c.png', 10),
    ]);
    await waitFor(async () => {
      await expect(canvas.getByText('b.png')).toBeInTheDocument();
    });
    await expect(canvas.queryByText('c.png')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('rejected')).toHaveTextContent(
      'at most 2 files',
    );
  },
};

/** Removing a file removes it from the list and fires the full list back. */
export const RemoveIsReachableByName: Story = {
  render: OversizeIsRejected.render,
  args: { ...Default.args, maxSize: undefined },
  play: async ({ canvas, canvasElement }) => {
    const input =
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, [file('report.png', 10)]);
    const remove = await canvas.findByRole('button', {
      name: 'Remove report.png',
    });
    await userEvent.click(remove);
    await waitFor(async () => {
      await expect(canvas.queryByText('report.png')).not.toBeInTheDocument();
    });
  },
};

/**
 * The count is announced. A drop changes nothing near the user's focus, so
 * without a live region there is no confirmation it did anything.
 */
export const CountIsAnnounced: Story = {
  render: OversizeIsRejected.render,
  args: { ...Default.args, maxSize: undefined },
  play: async ({ canvas, canvasElement }) => {
    const input =
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, [file('a.png', 10), file('b.png', 10)]);
    await waitFor(async () => {
      await expect(canvas.getByRole('status')).toHaveTextContent(
        '2 files selected',
      );
    });
  },
};
