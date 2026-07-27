const RESTORE_GRACE_MS = 150;

let lastFocusedElement: Element | null = null;
let focusedElementOnWindowBlur: Element | null = null;
let windowRefocusedAt = -Infinity;

const forgetRestoreState = () => {
  focusedElementOnWindowBlur = null;
  windowRefocusedAt = -Infinity;
};

document.addEventListener("focusin", (event) => {
  lastFocusedElement = event.target as Element | null;
});

window.addEventListener("blur", () => {
  focusedElementOnWindowBlur = lastFocusedElement;
});

window.addEventListener("focus", () => {
  windowRefocusedAt = performance.now();
});

window.addEventListener("pointerdown", forgetRestoreState, true);
window.addEventListener("keydown", forgetRestoreState, true);

export const isFocusRestoredByWindow = (element: Element | null): boolean => {
  const isRestore = (element !== null && element === focusedElementOnWindowBlur) || performance.now() - windowRefocusedAt < RESTORE_GRACE_MS;

  if (isRestore) forgetRestoreState();
  return isRestore;
};

export const isBlurCausedByWindow = (): boolean => !document.hasFocus();
