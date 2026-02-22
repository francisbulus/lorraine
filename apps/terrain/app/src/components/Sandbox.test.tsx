import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sandbox from './Sandbox';
import CodeEditor from './CodeEditor';

describe('CodeEditor', () => {
  it('renders textarea with initial code', () => {
    render(<CodeEditor initialCode="console.log(1)" onRun={() => {}} />);
    const textarea = screen.getByLabelText('Code editor') as HTMLTextAreaElement;
    expect(textarea.value).toBe('console.log(1)');
  });

  it('renders [Run] button', () => {
    render(<CodeEditor onRun={() => {}} />);
    expect(screen.getByText('[Run]')).toBeDefined();
  });

  it('calls onRun with code when [Run] is clicked', () => {
    const onRun = vi.fn();
    render(<CodeEditor initialCode="test code" onRun={onRun} />);
    fireEvent.click(screen.getByText('[Run]'));
    expect(onRun).toHaveBeenCalledWith('test code');
  });

  it('disables [Run] button when disabled prop is true', () => {
    render(<CodeEditor initialCode="code" onRun={() => {}} disabled />);
    const button = screen.getByText('[Run]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('disables [Run] button when code is empty', () => {
    render(<CodeEditor initialCode="" onRun={() => {}} />);
    const button = screen.getByText('[Run]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('uses font-data class on textarea', () => {
    render(<CodeEditor onRun={() => {}} />);
    const textarea = screen.getByLabelText('Code editor');
    expect(textarea.className).toContain('font-data');
  });
});

describe('Sandbox', () => {
  const defaultProps = {
    conceptId: 'tcp-basics',
    onRun: vi.fn().mockResolvedValue({
      execution: { success: true, output: '42', error: null, duration: 5 },
      annotation: 'The code computed 42.',
      suggestion: null,
    }),
  };

  it('renders sandbox label and code editor', () => {
    render(<Sandbox {...defaultProps} />);
    expect(screen.getByText('─ sandbox ─')).toBeDefined();
    expect(screen.getByLabelText('Code editor')).toBeDefined();
  });

  it('has correct aria-label', () => {
    render(<Sandbox {...defaultProps} />);
    expect(screen.getByRole('region', { name: 'sandbox: tcp-basics' })).toBeDefined();
  });

  it('shows output after run', async () => {
    render(<Sandbox {...defaultProps} />);
    const textarea = screen.getByLabelText('Code editor') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'console.log(42)' } });
    fireEvent.click(screen.getByText('[Run]'));

    await waitFor(() => {
      expect(screen.getByText('42')).toBeDefined();
    });
  });

  it('shows annotation after run', async () => {
    render(<Sandbox {...defaultProps} />);
    const textarea = screen.getByLabelText('Code editor') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'code' } });
    fireEvent.click(screen.getByText('[Run]'));

    await waitFor(() => {
      expect(screen.getByText('The code computed 42.')).toBeDefined();
    });
  });

  it('shows error for failed execution', async () => {
    const onRun = vi.fn().mockResolvedValue({
      execution: { success: false, output: '', error: 'ReferenceError: x is not defined', duration: 1 },
      annotation: 'The code failed.',
      suggestion: null,
    });
    render(<Sandbox {...defaultProps} onRun={onRun} />);
    const textarea = screen.getByLabelText('Code editor') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'x' } });
    fireEvent.click(screen.getByText('[Run]'));

    await waitFor(() => {
      expect(screen.getByText('ReferenceError: x is not defined')).toBeDefined();
    });
  });

  it('shows suggestion when present', async () => {
    const onRun = vi.fn().mockResolvedValue({
      execution: { success: true, output: '0', error: null, duration: 2 },
      annotation: 'It printed zero.',
      suggestion: 'What happens if you set the timeout to 0?',
    });
    render(<Sandbox {...defaultProps} onRun={onRun} />);
    const textarea = screen.getByLabelText('Code editor') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'code' } });
    fireEvent.click(screen.getByText('[Run]'));

    await waitFor(() => {
      expect(screen.getByText('What happens if you set the timeout to 0?')).toBeDefined();
    });
  });

  it('renders close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(<Sandbox {...defaultProps} onClose={onClose} />);
    const closeButton = screen.getByText('×');
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render close button without onClose', () => {
    render(<Sandbox {...defaultProps} />);
    expect(screen.queryByText('×')).toBeNull();
  });

  it('shows duration after run', async () => {
    render(<Sandbox {...defaultProps} />);
    const textarea = screen.getByLabelText('Code editor') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'code' } });
    fireEvent.click(screen.getByText('[Run]'));

    await waitFor(() => {
      expect(screen.getByText('5ms')).toBeDefined();
    });
  });
});
