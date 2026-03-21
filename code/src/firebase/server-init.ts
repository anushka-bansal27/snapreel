import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigValid } from './config';

let serverApp: FirebaseApp | undefined = undefined;
const appName = 'server-side-app';

if (isFirebaseConfigValid(firebaseConfig)) {
    if (!getApps().some(app => app.name === appName)) {
        serverApp = initializeApp(firebaseConfig, appName);
    } else {
        serverApp = getApp(appName);
    }
} else {
    // This will prevent server-side rendering from crashing if the config is not valid.
    // An error will still be logged on the server.
    console.error("Server-side Firebase initialization failed: Invalid configuration.");
}


const serverFirestore: Firestore | null = serverApp ? getFirestore(serverApp) : null;

export { serverFirestore };
