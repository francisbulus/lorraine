import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppShell from './AppShell';

describe('AppShell', () => {
  it('renders the top bar with app title', () => {
    render(<AppShell />);
    expect(screen.getByText('terrain')).toBeInTheDocument();
  });

  it('renders session duration', () => {
    render(<AppShell />);
    expect(screen.getByText('<1 min')).toBeInTheDocument();
  });

  it('renders conversation state by default', () => {
    render(<AppShell />);
    expect(screen.getByText('What do you want to learn?')).toBeInTheDocument();
  });

  it('renders map toggle in top bar', () => {
    render(<AppShell />);
    expect(screen.getByText('map')).toBeInTheDocument();
  });

  it('switches to map state when toggle clicked', () => {
    render(<AppShell />);
    fireEvent.click(screen.getByText('map'));
    expect(screen.getByText('← conversation')).toBeInTheDocument();
    expect(screen.queryByText('What do you want to learn?')).not.toBeInTheDocument();
  });

  it('switches back to conversation from map', () => {
    render(<AppShell />);
    fireEvent.click(screen.getByText('map'));
    fireEvent.click(screen.getByText('← conversation'));
    expect(screen.getByText('What do you want to learn?')).toBeInTheDocument();
  });

  it('renders input field with font-hand class', () => {
    render(<AppShell />);
    const input = screen.getByLabelText('Your message');
    expect(input).toBeInTheDocument();
    expect(input.className).toContain('font-hand');
  });

  it('does not show calibration glyph when no data', () => {
    render(<AppShell />);
    expect(screen.queryByLabelText('Open calibration')).not.toBeInTheDocument();
  });

  it('has no bottom bar', () => {
    render(<AppShell />);
    expect(screen.queryByLabelText('Zone navigation')).not.toBeInTheDocument();
    expect(screen.queryByText('Modes')).not.toBeInTheDocument();
  });

  it('does not render three-column panels', () => {
    render(<AppShell />);
    expect(screen.queryByLabelText('Map')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Margin')).not.toBeInTheDocument();
  });
});
