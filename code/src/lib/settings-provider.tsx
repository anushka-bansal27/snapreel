'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { GeneralSettings } from '@/lib/types';
import { getGeneralSettings } from './data.actions';

const SettingsContext = createContext<GeneralSettings | null>(null);

export function SettingsProvider({ children, initialSettings }: { children: React.ReactNode, initialSettings: GeneralSettings | null }) {
  const [settings, setSettings] = useState<GeneralSettings | null>(initialSettings);

  useEffect(() => {
    // If we didn't get initial settings from the server, fetch them now
    if (!initialSettings) {
        getGeneralSettings().then(setSettings);
    }
  }, [initialSettings]);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
