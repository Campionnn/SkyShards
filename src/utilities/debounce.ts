/** Trailing-edge debounce: `func` runs once, `wait` ms after the last call. */
export function debounce<TArgs extends unknown[], TReturn>(func: (...args: TArgs) => TReturn, wait: number): (...args: TArgs) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: TArgs) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
