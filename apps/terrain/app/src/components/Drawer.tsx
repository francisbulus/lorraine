'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}

export default function Drawer({ open, onClose, children, ariaLabel }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    },
    [open, onClose]
  );

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        open &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleKeyDown, handleClickOutside]);

  return (
    <aside
      ref={drawerRef}
      className={`drawer ${open ? 'drawer--open' : 'drawer--closed'}`}
      role="dialog"
      aria-label={ariaLabel}
      aria-hidden={!open}
    >
      <div className="drawer__header">
        <button
          className="drawer__close font-system"
          onClick={onClose}
          aria-label="Close drawer"
        >
          &times;
        </button>
      </div>
      <div className="drawer__content">
        {children}
      </div>
    </aside>
  );
}
