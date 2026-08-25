"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useEffect,
  useRef,
} from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let activeLocks = 0;
let savedOverflow = "";
let savedPaddingRight = "";
let savedPosition = "";
let savedTop = "";
let savedWidth = "";
let savedHtmlOverflow = "";
let savedHtmlOverscrollBehavior = "";
let savedScrollY = 0;

export function lockPageScroll() {
  if (activeLocks === 0) {
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;
    savedPosition = document.body.style.position;
    savedTop = document.body.style.top;
    savedWidth = document.body.style.width;
    savedHtmlOverflow = document.documentElement.style.overflow;
    savedHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;
    savedScrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = "100%";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  activeLocks += 1;
  return () => {
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      document.body.style.overflow = savedOverflow;
      document.body.style.paddingRight = savedPaddingRight;
      document.body.style.position = savedPosition;
      document.body.style.top = savedTop;
      document.body.style.width = savedWidth;
      document.documentElement.style.overflow = savedHtmlOverflow;
      document.documentElement.style.overscrollBehavior = savedHtmlOverscrollBehavior;
      if (savedScrollY > 0) window.scrollTo(0, savedScrollY);
    }
  };
}

type Options = {
  open: boolean;
  onClose: () => void;
  dialogRef: RefObject<HTMLDivElement | null>;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
};

/** Adds focus management, Escape and scroll locking to an existing dialog surface. */
export function useAccessibleDialog({
  open,
  onClose,
  dialogRef,
  closeOnEscape = true,
  initialFocusRef,
  restoreFocusRef,
}: Options) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = restoreFocusRef?.current ?? (
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    );
    const unlock = lockPageScroll();
    const timer = window.setTimeout(() => {
      const preferred = initialFocusRef?.current;
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (preferred ?? first ?? dialogRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      unlock();
      const target = returnFocusRef.current;
      if (target?.isConnected) window.setTimeout(() => target.focus(), 0);
    };
  }, [dialogRef, initialFocusRef, open, restoreFocusRef]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && closeOnEscape) {
      event.preventDefault();
      event.stopPropagation();
      closeRef.current();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (items.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return onKeyDown;
}
