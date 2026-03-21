import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getGeneralSettings } from './data.actions';

let initialized = false;

export async function getFirebaseAdmin() {
    if (initialized && getApps().length > 0) {
        return { auth: () => getAuth() };
    }

    const settings = await getGeneralSettings();
    if (!settings?.firebaseServiceAccount) {
        throw new Error('Firebase Service Account JSON is not configured in Admin Settings.');
    }

    try {
        let jsonString = settings.firebaseServiceAccount;
        let serviceAccount: any;
        
        if (typeof jsonString === 'string') {
            serviceAccount = JSON.parse(jsonString);
        } else if (typeof jsonString === 'object') {
            serviceAccount = jsonString;
        } else {
            throw new Error('Invalid format for Firebase Service Account.');
        }
        
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        // Initialize admin if not already initialized
        if (getApps().length === 0) {
            initializeApp({
                credential: cert(serviceAccount)
            });
        }
        
        initialized = true;
        return { auth: () => getAuth() };
    } catch (e: any) {
        console.error('Failed to initialize Firebase Admin SDK:', e);
        throw new Error('Invalid Firebase Service Account JSON: ' + (e.message || String(e)));
    }
}
