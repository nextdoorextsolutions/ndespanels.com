import { useEffect, useState } from 'react';

interface GoogleMapsLoaderProps {
  children: React.ReactNode;
}

export function GoogleMapsLoader({ children }: GoogleMapsLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || "AIzaSyA7QSM-fqUn4grHM6OYddNgKzK7uMlBY1I";

  useEffect(() => {
    // Check if already loaded with all required libraries
    if (window.google?.maps?.places && window.google?.maps?.drawing && window.google?.maps?.geometry) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );

    if (existingScript) {
      // Script exists, wait for it to load
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    // Create and load script with required libraries
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('[GoogleMapsLoader] Google Maps API loaded');
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error('[GoogleMapsLoader] Failed to load Google Maps API');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [apiKey]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Loading Google Maps...</div>
      </div>
    );
  }

  return <>{children}</>;
}
