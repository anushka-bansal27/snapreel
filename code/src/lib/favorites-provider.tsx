'use client';
import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Favorite, Series } from './types';
import { getUserFavorites } from './data.actions';
import { toggleFavoriteAction } from './actions';

interface FavoritesContextValue {
    favoriteIds: Set<string>;
    loading: boolean;
    toggleFavorite: (series: Series) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
    const { user } = useUser();
    const { toast } = useToast();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) {
            setFavorites([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const data = await getUserFavorites(user.uid);
        setFavorites(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const favoriteIds = useMemo(() => {
        return new Set(favorites.map(fav => fav.seriesId));
    }, [favorites]);

    const toggleFavorite = async (series: Series) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Login Required', description: 'You must be logged in to add favorites.'});
            return;
        }

        const result = await toggleFavoriteAction(user.uid, series.id);
        if (result.success) {
            toast({ title: result.action === 'added' ? 'Added to Favorites' : 'Removed from Favorites' });
            fetchData();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };

    const value = {
        favoriteIds,
        loading,
        toggleFavorite,
    };

    return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
}
