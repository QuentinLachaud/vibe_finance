import { useState } from 'react';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-btn confirm-btn--remove" onClick={onConfirm}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook to manage confirm dialog state */
export function useConfirmDialog() {
  const [pendingId, setPendingId] = useState<string | null>(null);

  return {
    pendingId,
    requestConfirm: (id: string) => setPendingId(id),
    cancel: () => setPendingId(null),
    confirm: (callback: (id: string) => void) => {
      if (pendingId) {
        callback(pendingId);
        setPendingId(null);
      }
    },
  };
}
