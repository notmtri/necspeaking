import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountLinkPage, { takeTokenFromLocation } from './AccountLinkPage';

const jsonResponse = (status, payload) => ({
  ok: status < 400,
  status,
  headers: { get: () => 'application/json' },
  json: async () => payload,
});

describe('takeTokenFromLocation', () => {
  it('reads the token from the fragment and wipes it from the address bar', () => {
    const history = { state: null, replaceState: vi.fn() };
    const token = takeTokenFromLocation({ hash: '#token=abc.def-ghi', pathname: '/reset-password', search: '' }, history);
    expect(token).toBe('abc.def-ghi');
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/reset-password');
  });

  it('returns nothing when the link has no token', () => {
    const history = { state: null, replaceState: vi.fn() };
    expect(takeTokenFromLocation({ hash: '', pathname: '/verify-email', search: '' }, history)).toBe('');
    expect(history.replaceState).not.toHaveBeenCalled();
  });
});

describe('AccountLinkPage', () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState(null, '', '/');
  });

  const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  const typeInto = (field, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('confirms the email once and hands back the user', async () => {
    window.history.replaceState(null, '', '/verify-email#token=good-token');
    global.fetch = vi.fn(async () => jsonResponse(200, { success: true, user: { id: 'user-1', emailVerified: true } }));
    const onUserUpdate = vi.fn();

    await act(async () => root.render(<AccountLinkPage kind="verify-email" onUserUpdate={onUserUpdate} navTo={vi.fn()} />));
    await settle();

    const calls = global.fetch.mock.calls.filter(([url]) => String(url).includes('/api/auth/verify-email'));
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0][1].body)).toEqual({ token: 'good-token' });
    expect(onUserUpdate).toHaveBeenCalledWith({ id: 'user-1', emailVerified: true });
    expect(container.textContent).toContain('Email confirmed');
    expect(window.location.hash).toBe('');
  });

  it('shows the reason when a link has expired', async () => {
    window.history.replaceState(null, '', '/verify-email#token=old');
    global.fetch = vi.fn(async () => jsonResponse(400, { error: 'This link has expired. Ask for a new one.' }));

    await act(async () => root.render(<AccountLinkPage kind="verify-email" navTo={vi.fn()} />));
    await settle();
    expect(container.textContent).toContain('This link has expired');
  });

  it('sets a new password and logs the student in', async () => {
    window.history.replaceState(null, '', '/reset-password#token=reset-token');
    global.fetch = vi.fn(async () => jsonResponse(200, { success: true, user: { id: 'user-1' } }));
    const onUserUpdate = vi.fn();
    const navTo = vi.fn();

    await act(async () => root.render(<AccountLinkPage kind="reset-password" onUserUpdate={onUserUpdate} navTo={navTo} notify={vi.fn()} />));
    const [password, confirm] = container.querySelectorAll('input[type="password"]');
    await act(async () => {
      typeInto(password, 'newpassword2');
      typeInto(confirm, 'newpassword2');
    });
    await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await settle();

    const resetCall = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/auth/password/reset'));
    expect(JSON.parse(resetCall[1].body)).toEqual({ token: 'reset-token', newPassword: 'newpassword2' });
    expect(onUserUpdate).toHaveBeenCalledWith({ id: 'user-1' });
    expect(navTo).toHaveBeenCalledWith('profile');
  });

  it('catches mismatched passwords before sending anything', async () => {
    window.history.replaceState(null, '', '/reset-password#token=reset-token');
    global.fetch = vi.fn();

    await act(async () => root.render(<AccountLinkPage kind="reset-password" navTo={vi.fn()} />));
    const [password, confirm] = container.querySelectorAll('input[type="password"]');
    await act(async () => {
      typeInto(password, 'newpassword2');
      typeInto(confirm, 'different99');
    });
    await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

    expect(container.textContent).toContain("don't match");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
