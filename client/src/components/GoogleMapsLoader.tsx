import { useEffect, useState } from 'react';

interface GoogleMapsLoaderProps {
  children: React.ReactNode;
}

export function GoogleMapsLoader({ children }: GoogleMapsLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || "AIzaSyD9aUoEaPhMZGbEwU8KPajIu3zxPHI3uQE";

  useEffect(() => {
    // Safety check: Ensure API key is present
    if (!apiKey) {
      const errorMsg = '❌ Missing VITE_GOOGLE_MAPS_KEY environment variable. Please add it to your .env file.';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

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
      console.log('[GoogleMapsLoader] ✅ Google Maps API loaded successfully');
      setIsLoaded(true);
    };
    script.onerror = () => {
      const errorMsg = '❌ Failed to load Google Maps API. Check your API key and network connection.';
      console.error('[GoogleMapsLoader]', errorMsg);
      setError(errorMsg);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Loading Google Maps...</div>
      </div>
    );
  }

  return <>{children}</>;
}
