import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wrench, RefreshCw } from 'lucide-react';
import { statusApi } from '@/lib/api';

interface MaintenanceOverlayProps {
  children: React.ReactNode;
}

/**
 * Wraps the app — polls /api/status every 10 s.
 * When inMaintenance is true, shows a full-screen maintenance screen
 * instead of the app content.
 * Admins see a soft banner instead of a hard block (the backend already
 * lets admin routes through, so this is purely cosmetic for admins).
 */
const MaintenanceOverlay = ({ children }: MaintenanceOverlayProps) => {
  const [dots, setDots] = useState('');

  const { data } = useQuery({
    queryKey: ['app-status'],
    queryFn: async () => {
      const res = await statusApi.getStatus();
      return res.data.data;
    },
    refetchInterval: 10_000, // poll every 10 s
    staleTime: 0,
    retry: false,
  });

  // Animated dots
  useEffect(() => {
    if (!data?.inMaintenance) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 600);
    return () => clearInterval(interval);
  }, [data?.inMaintenance]);

  if (data?.inMaintenance) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
        {/* Animated gear */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-hero shadow-elevated">
          <Wrench className="h-12 w-12 animate-bounce text-primary-foreground" />
        </div>

        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          Under Maintenance
        </h1>

        <p className="mt-4 max-w-md text-muted-foreground">
          Our AI model is being retrained with new verified data to improve
          recommendation accuracy. We'll be back shortly{dots}
        </p>

        {data.startedAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Started at {new Date(data.startedAt).toLocaleTimeString('en-IN')}
          </p>
        )}

        {/* Auto-refresh indicator */}
        <div className="mt-8 flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Checking every 10 seconds…
        </div>

        {/* Progress shimmer */}
        <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 rounded-full bg-gradient-hero [animation:shimmer_1.5s_ease-in-out_infinite]"
               style={{ animation: 'shimmer 1.5s ease-in-out infinite' }} />
        </div>

        <style>{`
          @keyframes shimmer {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
};

export default MaintenanceOverlay;
