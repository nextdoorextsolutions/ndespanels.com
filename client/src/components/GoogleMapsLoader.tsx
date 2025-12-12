import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface GoogleMapsLoaderProps {
  children: React.ReactNode;
}

export function GoogleMapsLoader({ children }: GoogleMapsLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || "AIzaSyD9aUoEaPhMZGbEwU8KPajIu3zxPHI3uQE";

  useEffect(() => {
    let isMounted = true;

    async function loadGoogleMaps() {
      try {
        // Safety check: Ensure API key is present
        if (!apiKey) {
          throw new Error('Missing VITE_GOOGLE_MAPS_KEY environment variable. Please add it to your .env file.');
        }

        // Check if already loaded with all required libraries
        if (window.google?.maps?.places) {
          if (isMounted) setIsLoaded(true);
          return;
        }

        // Check if script is already in DOM
        const existingScript = document.querySelector(
          `script[src*="maps.googleapis.com/maps/api/js"]`
        );

        if (existingScript) {
          // Script exists, wait for it to load
          await new Promise((resolve, reject) => {
            existingScript.addEventListener('load', resolve);
            existingScript.addEventListener('error', reject);
          });
          if (isMounted) setIsLoaded(true);
          return;
        }

        // Create and load script with required libraries using new API
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,geometry&loading=async`;
        script.async = true;
        script.defer = true;

        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            console.log('[GoogleMapsLoader] ✅ Google Maps API loaded successfully');
            resolve();
          };
          script.onerror = () => {
            reject(new Error('Failed to load Google Maps script'));
          };
          document.head.appendChild(script);
        });

        // Use new importLibrary pattern for Places API
        if (window.google?.maps?.importLibrary) {
          await window.google.maps.importLibrary('places');
          console.log('[GoogleMapsLoader] ✅ Places library loaded via importLibrary');
        }

        if (isMounted) setIsLoaded(true);
      } catch (err: any) {
        console.error('[GoogleMapsLoader] Error:', err);
        if (isMounted) {
          // Handle specific API errors
          if (err.message?.includes('ApiTargetBlockedMapError')) {
            setError('Google Maps API is blocked or restricted. Please check your API key configuration and billing.');
          } else if (err.message?.includes('not available for new customers')) {
            setError('This Google Maps API version is deprecated. Please contact support.');
          } else {
            setError(err.message || 'Failed to load Google Maps API. Check your API key and network connection.');
          }
        }
      }
    }

    loadGoogleMaps();

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Show error state if API key is missing or loading failed
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="max-w-md p-6 bg-red-900/20 border border-red-500 rounded-lg">
          <h3 className="text-red-400 font-semibold mb-2">Google Maps Configuration Error</h3>
          <p className="text-slate-300 text-sm">{error}</p>
          <p className="text-slate-400 text-xs mt-3">
            Add <code className="bg-slate-800 px-2 py-1 rounded">VITE_GOOGLE_MAPS_KEY</code> to your .env file
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#00d4aa]" />
          <div className="text-slate-400">Loading Google Maps...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
