import { useState, useEffect, useCallback, useRef } from 'react';
import { clusterService, type ClusterData } from '../services/clusterService';

export function useClusters() {
  const [clusters, setClusters] = useState<ClusterData[]>(() => {
    return clusterService.getCachedClusters() || [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = clusterService.getCachedClusters();
    return !cached || cached.length === 0;
  });
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const revalidate = useCallback(async () => {
    try {
      const res = await clusterService.revalidate();
      if (isMountedRef.current && res.success && res.data) {
        setClusters(res.data);
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || 'Failed to revalidate');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Subscribe to SWR live cache updates
    const unsubscribe = clusterService.subscribe((newClusters) => {
      if (isMountedRef.current && newClusters) {
        setClusters(newClusters);
        setIsLoading(false);
      }
    });

    // Trigger initial fetch / background revalidation
    clusterService.getClusters().then((res) => {
      if (isMountedRef.current && res.success && res.data) {
        setClusters(res.data);
        setIsLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  return {
    clusters,
    isLoading,
    error,
    revalidate,
  };
}

export default useClusters;
