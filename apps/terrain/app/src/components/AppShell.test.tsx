import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppShell from './AppShell';

describe('AppShell', () => {
  it('renders the header with app title', () => {
    render(<AppShell />);
    expect(screen.getByText('terrain')).toBeInTheDocument();
  });

  it('renders session duration', () => {
    render(<AppShell />);
    expect(screen.getByText('<1 min')).toBeInTheDocument();
  });

  it('renders three panels', () => {
    render(<AppShell />);
    expect(screen.getByLabelText('Map')).toBeInTheDocument();
    expect(screen.getByLabelText('Conversation')).toBeInTheDocument();
    expect(screen.getByLabelText('Margin')).toBeInTheDocument();
  });

  it('renders the bottom bar with four zones', () => {
    render(<AppShell />);
    expect(screen.getByLabelText('Zone navigation')).toBeInTheDocument();
    expect(screen.getByText('Map')).toBeInTheDocument();
    expect(screen.getByText('Conversation')).toBeInTheDocument();
    expect(screen.getByText('Modes')).toBeInTheDocument();
    expect(screen.getByText('Calibration')).toBeInTheDocument();
  });

  it('renders the first session empty state', () => {
    render(<AppShell />);
    expect(screen.getByText('What do you want to learn?')).toBeInTheDocument();
  });

  it('toggles map panel when Map zone is clicked', () => {
    render(<AppShell />);
    const mapPanel = screen.getByLabelText('Map');
    expect(mapPanel.className).toContain('map-panel--open');

    fireEvent.click(screen.getByText('Map'));
    expect(mapPanel.className).toContain('map-panel--closed');

    fireEvent.click(screen.getByText('Map'));
    expect(mapPanel.className).toContain('map-panel--open');
  });

  it('toggles margin panel when Calibration zone is clicked', () => {
    render(<AppShell />);
    const marginPanel = screen.getByLabelText('Margin');
    expect(marginPanel.className).toContain('margin-panel--open');

    fireEvent.click(screen.getByText('Calibration'));
    expect(marginPanel.className).toContain('margin-panel--closed');

    fireEvent.click(screen.getByText('Calibration'));
    expect(marginPanel.className).toContain('margin-panel--open');
  });

  it('renders input field with font-hand class', () => {
    render(<AppShell />);
    const input = screen.getByLabelText('Your message');
    expect(input).toBeInTheDocument();
    expect(input.className).toContain('font-hand');
  });
});
