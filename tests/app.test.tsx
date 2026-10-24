import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('bench shell', () => {
  it('renders the first School calibre and its rate', () => {
    render(<App />);
    expect(screen.getAllByText('ESCAPEMENT').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+32\.0 s\/d/).length).toBeGreaterThan(0);
    expect(screen.getByRole('slider', { name: /Regulator index/ })).toHaveAttribute(
      'aria-valuenow',
      '8',
    );
    expect(screen.getByRole('combobox', { name: /Case/i })).toHaveValue('school');
    expect(screen.getByText('Rate · amplitude · beat')).toBeInTheDocument();
  });
});
