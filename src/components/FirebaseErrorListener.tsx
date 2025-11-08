'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx.
 */
export function FirebaseErrorListener() {
  // Use the specific error type for the state for type safety.
  const [error, setError] = useState<FirestorePermissionError | Error | null>(null);

  useEffect(() => {
    // The callback now expects a strongly-typed error, matching the event payload.
    const handleError = (error: FirestorePermissionError) => {
      // Set error in state to trigger a re-render.
      setError(error);
    };

    // The typed emitter will enforce that the callback for 'permission-error'
    // matches the expected payload type (FirestorePermissionError).
    errorEmitter.on('permission-error', handleError);

    // Unsubscribe on unmount to prevent memory leaks.
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // On re-render, if an error exists in state, throw it.
  if (error) {
    // Suppress the specific flushSync error by checking its message
    // before re-throwing it. This prevents the Next.js development
    // overlay from appearing for this specific, non-critical warning.
    if (error.message.includes('flushSync')) {
        // Log it silently to the console for debugging if needed, but don't throw.
        console.log('Suppressed flushSync warning:', error);
        // Reset the error state to prevent re-throwing on subsequent renders
        setError(null);
    } else {
        // For any other error, throw it to make it visible.
        throw error;
    }
  }

  // This component renders nothing.
  return null;
}
