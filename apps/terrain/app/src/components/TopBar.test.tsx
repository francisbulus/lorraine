import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from './TopBar';

describe('TopBar', () => {
  const defaultProps = {
    onCalibrationClick: vi.fn(),
    sessionStart: Date.now(),
  };

  it('renders app title', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('terrain')).toBeInTheDocument();
  });

  it('does not render toggle button', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.queryByText('map')).not.toBeInTheDocument();
    expect(screen.queryByText('← conversation')).not.toBeInTheDocument();
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

  it('shows focused concept name when provided', () => {
    render(<TopBar {...defaultProps} focusedConcept="TCP Basics" />);
    expect(screen.getByText('TCP Basics')).toBeInTheDocument();
  });

  it('does not show focused concept when null', () => {
    render(<TopBar {...defaultProps} focusedConcept={null} />);
    // No extra text elements besides terrain and timer
    expect(screen.queryByText('TCP Basics')).not.toBeInTheDocument();
  });
});
