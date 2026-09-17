import { useState, useEffect } from 'react';
import { favoriteService } from '../services/favoriteService';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    // 1. Initial load from localStorage for instant feedback
    const stored = localStorage.getItem('streetbites_favorites');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse local favorites:', e);
      }
    }

    // 2. Fetch remote favorites from backend
    const fetchRemoteFavorites = async () => {
      try {
        const res = await favoriteService.getFavorites();
        if (res.success && Array.isArray(res.data)) {
          const remoteIds = res.data.map((s: any) => String(s.id || s._id));
          setFavorites(remoteIds);
          localStorage.setItem('streetbites_favorites', JSON.stringify(remoteIds));
        }
      } catch (err) {
        // Silently fallback to localStorage if user is offline or not logged in
      }
    };

    fetchRemoteFavorites();
  }, []);

  const toggleFavorite = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const isFav = favorites.includes(id);
    const updated = isFav ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem('streetbites_favorites', JSON.stringify(updated));

    try {
      if (isFav) {
        await favoriteService.removeFavorite(id);
      } else {
        await favoriteService.addFavorite(id);
      }
    } catch (err) {
      console.warn('Could not sync favorite to backend:', err);
    }
  };

  const isFavorite = (id: string) => favorites.includes(id);

  return { favorites, toggleFavorite, isFavorite };
};
