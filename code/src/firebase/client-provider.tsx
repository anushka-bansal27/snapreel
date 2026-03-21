'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { GeneralSettings } from '@/lib/types';

interface FirebaseClientProviderProps {
  children: ReactNode;
  lang: string;
  settings?: GeneralSettings | null;
}

export function FirebaseClientProvider({
  children,
  lang,
  settings,
}: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Map settings to Firebase config object if they exist in MongoDB
    // This ensures the client uses the keys from the Admin panel
    const config = settings?.firebaseApiKey ? {
        apiKey: settings.firebaseApiKey,
        authDomain: settings.firebaseAuthDomain,
        projectId: settings.firebaseProjectId,
        storageBucket: settings.firebaseStorageBucket,
        messagingSenderId: settings.firebaseMessagingSenderId,
        appId: settings.firebaseAppId,
        measurementId: settings.firebaseMeasurementId,
    } : undefined;

    return initializeFirebase(config);
  }, [settings]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
