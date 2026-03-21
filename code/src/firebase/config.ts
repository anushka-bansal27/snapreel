export const firebaseConfig = {
  "projectId": "",
  "appId": "",
  "apiKey": "",
  "authDomain": "",
  "measurementId": "",
  "messagingSenderId": ""
};

export function isFirebaseConfigValid(config: any): boolean {
  if (!config) return false;
  return (
    typeof config.apiKey === 'string' &&
    config.apiKey &&
    typeof config.authDomain === 'string' &&
    config.authDomain &&
    typeof config.projectId === 'string' &&
    config.projectId
  );
}
