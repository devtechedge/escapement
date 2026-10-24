import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';

async function mount() {
  render(<App />);
  await waitFor(() => expect(screen.getByRole('combobox', { name: /Case/i })).toBeInTheDocument());
}

describe('bench shell', () => {
  it('renders the first School calibre and its rate', async () => {
    await mount();
    expect(screen.getByRole('heading', { level: 1, name: 'ESCAPEMENT' })).toBeInTheDocument();
    expect(screen.getAllByText(/\+32\.0 s\/d/).length).toBeGreaterThan(0);
    expect(screen.getByRole('slider', { name: /Regulator index/ })).toHaveAttribute(
      'aria-valuenow',
      '8',
    );
    expect(screen.getByRole('combobox', { name: /Case/i })).toHaveValue('school');
    expect(screen.getByText('Rate · amplitude · beat')).toBeInTheDocument();
  });

  it('shows the Pocket with an empty fourth socket and a disabled test', async () => {
    await mount();
    fireEvent.change(screen.getByRole('combobox', { name: /Case/i }), {
      target: { value: 'pocket' },
    });
    expect(screen.getAllByText('Fourth wheel missing').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Select Fourth · missing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run test/ })).toBeDisabled();
    expect(screen.getAllByText(/fourth wheel is in the spares tray/i).length).toBeGreaterThan(0);
  });

  it('shows the Marine at zero reserve as stopped, not with a fabricated rate', async () => {
    await mount();
    fireEvent.change(screen.getByRole('combobox', { name: /Case/i }), {
      target: { value: 'marine' },
    });
    expect(screen.getByLabelText('Current predicted rate')).toHaveTextContent('Stopped');
    expect(screen.queryByText('+12.0 s/d')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run test/ })).toBeDisabled();
  });

  it('dismisses the first-run hint on the first regulator change', async () => {
    await mount();
    expect(screen.getByText(/Move the regulator one notch/)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('slider', { name: /Regulator index/ }), {
      key: 'Home',
    });
    await waitFor(() => expect(screen.queryByText(/Move the regulator one notch/)).toBeNull());
  });

  it('switches themes and remembers the choice', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to the night bench' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('night'));
    expect(window.localStorage.getItem('escapement.theme')).toBe('night');
  });

  it('saves the current bench to the shelf', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: /Open the calibre shelf/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save current bench' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Load' })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/The shelf is empty/)).not.toBeInTheDocument();
  });

  it('gives every wheel an accessible name that starts with its visible label', async () => {
    await mount();
    expect(screen.getByRole('button', { name: 'Select Barrel · 80t' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Center · 64t' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Third · 60t' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Fourth · 60t' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Escape · 15t' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Balance · hairspring' })).toBeInTheDocument();
  });

  it('copies a validated share link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(screen.getByText('Build link copied.')).toBeInTheDocument());
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('#build=');
  });
});
