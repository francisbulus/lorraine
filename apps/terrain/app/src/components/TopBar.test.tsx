import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from './TopBar';

describe('TopBar', () => {
  const defaultProps = {
    appState: 'conversation' as const,
    onToggleState: vi.fn(),
    onCalibrationClick: vi.fn(),
    sessionStart: Date.now(),
  };

  it('renders app title', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('terrain')).toBeInTheDocument();
  });

  it('shows map toggle in conversation state', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('map')).toBeInTheDocument();
  });

  it('shows conversation toggle in map state', () => {
    render(<TopBar {...defaultProps} appState="map" />);
    expect(screen.getByText('← conversation')).toBeInTheDocument();
  });

  it('calls onToggleState when toggle clicked', () => {
    const onToggle = vi.fn();
    render(<TopBar {...defaultProps} onToggleState={onToggle} />);
    fireEvent.click(screen.getByText('map'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('renders session timer', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('<1 min')).toBeInTheDocument();
  });

  it('hides calibration glyph when no data', () => {
    render(<TopBar {...defaultProps} hasCalibrationData={false} />);
    expect(screen.queryByLabelText('Open calibration')).not.toBeInTheDocument();
  });

  it('shows calibration glyph when data available', () => {
    render(<TopBar {...defaultProps} hasCalibrationData={true} />);
    expect(screen.getByLabelText('Open calibration')).toBeInTheDocument();
  });

  it('calls onCalibrationClick when glyph clicked', () => {
    const onCalibration = vi.fn();
    render(
      <TopBar {...defaultProps} hasCalibrationData={true} onCalibrationClick={onCalibration} />
    );
    fireEvent.click(screen.getByLabelText('Open calibration'));
    expect(onCalibration).toHaveBeenCalledOnce();
  });
});
