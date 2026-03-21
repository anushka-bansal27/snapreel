'use client';

import { useFirebase } from '../provider';

/**
 * Consumes the global shared user profile state from FirebaseProvider.
 * This ensures coins and unlocked episodes are synchronized across all components instantly.
 */
export function useUser() {
  const { user, userProfile, isUserLoading: loading, refreshProfile } = useFirebase();

  return { user, userProfile, loading, refreshProfile };
}
