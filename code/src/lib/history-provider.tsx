'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { WatchHistory } from './types';
import { getUserHistory } from './data.actions';
import { removeHistoryItemAction, clearHistoryAction, updateHistoryAction } from './actions';

interface WatchHistoryContextValue {
    watchHistory: WatchHistory[];
    loading: boolean;
    updateHistory: (payload: { seriesId: string; episodeId: string; episodeInSeason: number; progress: number }, options?: { silent?: boolean }) => Promise<void>;
    removeHistoryItem: (seriesId: string) => Promise<void>;
    clearAllHistory: () => Promise<void>;
}

const WatchHistoryContext = createContext<WatchHistoryContextValue | null>(null);

export function WatchHistoryProvider({ children }: { children: ReactNode }) {
    const { user } = useUser();
    const { toast } = useToast();
    const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) {
            setWatchHistory([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const data = await getUserHistory(user.uid);
        setWatchHistory(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const updateHistory = async (payload: { seriesId: string; episodeId: string; episodeInSeason: number; progress: number }, options?: { silent?: boolean }) => {
        if (!user) return;
        
        // Optimistic update for local UI if not silent
        const result = await updateHistoryAction({ userId: user.uid, ...payload });
        
        if (result.success && !options?.silent) {
            // Only re-fetch everything if it's a critical update (like changing episodes)
            // For periodic progress updates, we skip fetchData to save performance
            fetchData();
        }
    };

    const removeHistoryItem = async (seriesId: string) => {
        if (!user) return;
        const result = await removeHistoryItemAction(user.uid, seriesId);
        if (result.success) {
            toast({ title: 'Removed from History' });
            fetchData();
        }
    };

    const clearAllHistory = async () => {
        if (!user) return;
        const result = await clearHistoryAction(user.uid);
        if (result.success) {
            toast({ title: 'History Cleared' });
            fetchData();
        }
    };

    const value = {
        watchHistory,
        loading,
        updateHistory,
        removeHistoryItem,
        clearAllHistory,
    };

    return <WatchHistoryContext.Provider value={value}>{children}</WatchHistoryContext.Provider>
}

export function useWatchHistory() {
    const context = useContext(WatchHistoryContext);
    if (!context) {
        throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
    }
    return context;
}
