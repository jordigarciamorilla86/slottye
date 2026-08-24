"use client";

import { useRef, useState } from "react";
import { AlertTriangle, HelpCircle, Trash2 } from "lucide-react";

import { Dialog } from "./Dialog";
import styles from "./Dialog.module.css";

export type ConfirmDialogVariant = "neutral" | "warning" | "danger";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  variant?: ConfirmDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Text the user must type exactly before confirmation is enabled, e.g. `ELIMINAR`. */
  confirmText?: string;
  pending?: boolean;
};

const variantCopy: Record<ConfirmDialogVariant, { confirm: string; instruction: string }> = {
  neutral: { confirm: "Confirmar", instruction: "Escribe {text} para confirmar" },
  warning: { confirm: "Continuar", instruction: "Escribe {text} para continuar" },
  danger: { confirm: "Eliminar", instruction: "Escribe {text} para eliminar" },
};

export function ConfirmDialog({
  open,
  ...props
}: ConfirmDialogProps) {
  if (!open) return null;
  return <OpenConfirmDialog open {...props} />;
}

function OpenConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  variant = "neutral",
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmText,
  pending = false,
}: ConfirmDialogProps) {
  const [typedText, setTypedText] = useState("");
  const [internalPending, setInternalPending] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = pending || internalPending;
  const isConfirmed = !confirmText || typedText === confirmText;

  async function confirm() {
    if (!isConfirmed || busy) return;
    try {
      setInternalPending(true);
      await onConfirm();
    } finally {
      setInternalPending(false);
    }
  }

  const Icon = variant === "danger" ? Trash2 : variant === "warning" ? AlertTriangle : HelpCircle;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => { if (!busy) onOpenChange(nextOpen); }}
      title={title}
      showCloseButton={!busy}
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
      initialFocusRef={confirmText ? inputRef : cancelRef}
      footer={(
        <>
          <button ref={cancelRef} type="button" className={`${styles.button} ${styles.cancel}`} disabled={busy} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </button>
          <button type="button" className={`${styles.button} ${styles[variant]}`} disabled={!isConfirmed || busy} onClick={confirm}>
            {busy ? "Procesando…" : (confirmLabel ?? variantCopy[variant].confirm)}
          </button>
        </>
      )}
    >
      <div className={styles.confirmIntro}>
        <span className={`${styles.icon} ${styles[`${variant}Icon`]}`} aria-hidden="true">
          <Icon size={22} strokeWidth={2.2} />
        </span>
        <div className={styles.confirmCopy}>
          <p className={styles.confirmText}>{description}</p>
        </div>
      </div>
      {confirmText ? (
        <label className={styles.confirmationField}>
          <span className={styles.confirmationLabel}>
            {variantCopy[variant].instruction.replace("{text}", confirmText)}
          </span>
          <input
            ref={inputRef}
            className={styles.confirmationInput}
            value={typedText}
            onChange={(event) => setTypedText(event.target.value)}
            placeholder={confirmText}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      ) : null}
    </Dialog>
  );
}
