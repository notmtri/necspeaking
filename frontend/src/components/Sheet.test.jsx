import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sheet from './Sheet';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const render = async (ui) => {
  await act(async () => root.render(ui));
};

const settle = async () => {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
};

describe('Sheet', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    document.documentElement.style.overflow = '';
  });

  it('opens as a labelled dialog in a portal and locks page scroll', async () => {
    await render(
      <Sheet onClose={() => {}} labelledBy="t">
        <h2 id="t">Hello</h2>
      </Sheet>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-labelledby')).toBe('t');
    expect(container.contains(dialog)).toBe(false); // portalled to body
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('closes on Escape and on a backdrop click', async () => {
    const onClose = vi.fn();
    await render(<Sheet onClose={onClose} labelledBy="t"><p>Body</p></Sheet>);
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    const backdrop = document.querySelector('[role="dialog"]').parentElement;
    await act(async () => backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('cannot be dismissed while it is busy', async () => {
    const onClose = vi.fn();
    await render(<Sheet onClose={onClose} dismissible={false} labelledBy="t"><p>Saving</p></Sheet>);
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    const backdrop = document.querySelector('[role="dialog"]').parentElement;
    await act(async () => backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('animates out, then unmounts and releases the page', async () => {
    await render(<Sheet open onClose={() => {}} labelledBy="t"><p>Body</p></Sheet>);
    await render(<Sheet open={false} onClose={() => {}} labelledBy="t"><p>Body</p></Sheet>);
    await settle();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('puts focus back on the button that opened it, even with an autoFocus field', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    await render(<Sheet open onClose={() => {}} labelledBy="t"><textarea autoFocus aria-label="box" /></Sheet>);
    expect(document.activeElement.getAttribute('aria-label')).toBe('box');
    await render(<Sheet open={false} onClose={() => {}} labelledBy="t"><textarea autoFocus aria-label="box" /></Sheet>);
    await settle();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('keeps focus in a field while the parent re-renders with a new onClose', async () => {
    // Opened from a focused button, then the user clicks into a second field.
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const ui = () => <Sheet open onClose={() => {}} labelledBy="t"><input aria-label="contact" /></Sheet>;
    await render(ui());
    const field = document.querySelector('input[aria-label="contact"]');
    field.focus();
    // Each keystroke re-renders the parent, which passes a fresh inline onClose.
    for (let i = 0; i < 3; i += 1) await render(ui());
    await settle();
    expect(document.activeElement).toBe(field);
    trigger.remove();
  });

  it('can refuse backdrop clicks and anchor to the top (the admin panel)', async () => {
    const onClose = vi.fn();
    await render(<Sheet onClose={onClose} backdropCloses={false} align="top" labelledBy="t"><p>Form</p></Sheet>);
    const backdrop = document.querySelector('[role="dialog"]').parentElement;
    expect(backdrop.className).toContain('items-start');
    await act(async () => backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(onClose).toHaveBeenCalledTimes(1); // Escape still closes it
  });
});
