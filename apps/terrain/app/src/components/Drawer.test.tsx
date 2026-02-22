import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Drawer from './Drawer';

describe('Drawer', () => {
  it('renders children when open', () => {
    render(
      <Drawer open={true} onClose={() => {}} ariaLabel="Test drawer">
        <p>Drawer content</p>
      </Drawer>
    );
    expect(screen.getByText('Drawer content')).toBeInTheDocument();
  });

  it('has open class when open', () => {
    render(
      <Drawer open={true} onClose={() => {}} ariaLabel="Test drawer">
        <p>Content</p>
      </Drawer>
    );
    const drawer = screen.getByRole('dialog');
    expect(drawer.className).toContain('drawer--open');
  });

  it('has closed class when closed', () => {
    render(
      <Drawer open={false} onClose={() => {}} ariaLabel="Test drawer">
        <p>Content</p>
      </Drawer>
    );
    const drawer = screen.getByRole('dialog', { hidden: true });
    expect(drawer.className).toContain('drawer--closed');
  });

  it('calls onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </Drawer>
    );
    fireEvent.click(screen.getByLabelText('Close drawer'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </Drawer>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose on Escape when closed', () => {
    const onClose = vi.fn();
    render(
      <Drawer open={false} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </Drawer>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking outside', () => {
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside">outside</div>
        <Drawer open={true} onClose={onClose} ariaLabel="Test drawer">
          <p>Content</p>
        </Drawer>
      </div>
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when clicking inside', () => {
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </Drawer>
    );
    fireEvent.mouseDown(screen.getByText('Content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sets aria-hidden correctly', () => {
    const { rerender } = render(
      <Drawer open={true} onClose={() => {}} ariaLabel="Test drawer">
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-hidden', 'false');

    rerender(
      <Drawer open={false} onClose={() => {}} ariaLabel="Test drawer">
        <p>Content</p>
      </Drawer>
    );
    // When closed, aria-hidden is true but dialog role may not be queryable
    const drawer = document.querySelector('.drawer');
    expect(drawer).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses provided aria-label', () => {
    render(
      <Drawer open={true} onClose={() => {}} ariaLabel="Concept detail">
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByLabelText('Concept detail')).toBeInTheDocument();
  });
});
