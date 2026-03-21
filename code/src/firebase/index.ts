'use client';

import { firebaseConfig as staticFirebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Initializes Firebase with a dynamic or static configuration.
 * Handles re-initialization if the configuration changes (e.g., keys updated in Admin).
 */
export function initializeFirebase(config?: any) {
  const activeConfig = (config && config.apiKey) ? config : staticFirebaseConfig;

  const existingApps = getApps();
  if (existingApps.length) {
    const currentApp = existingApps[0];
    
    // Check if we need to re-initialize because the API Key changed
    if (currentApp.options.apiKey !== activeConfig.apiKey) {
        // We delete the existing app to apply the new configuration
        // This is a synchronous-like wrapper for the internal logic
        try {
            // In a real production app, you might want to handle this more gracefully
            // but for a dynamic-key prototype, this is the most reliable way.
            // Note: deleteApp is technically async, but we proceed to initialize a new one.
            deleteApp(currentApp).catch(console.error);
        } catch (e) {
            console.error("Failed to delete old Firebase app:", e);
        }
    } else {
        // Config is the same, reuse existing SDKs
        return getSdks(currentApp);
    }
  }

  let firebaseApp: FirebaseApp;
  try {
    firebaseApp = initializeApp(activeConfig);
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    firebaseApp = getApp();
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
