// In a real-world scenario, you'd want this to be conditional based on the environment
// and perhaps more robust, but for this specific case, it's a direct solution.

export function suppressFlushSyncWarning() {
  if (typeof window === 'undefined') return;

  const originalConsoleError = console.error;
  const errorToSuppress =
    'flushSync was called from inside a lifecycle method';

  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes(errorToSuppress)
    ) {
      return; // Suppress the error
    }
    originalConsoleError.apply(console, args);
  };
}
