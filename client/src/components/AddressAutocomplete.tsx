import { useState, useRef, useEffect } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { AlertCircle, Loader2 } from 'lucide-react';

interface AddressAutocompleteProps {
  onPlaceSelected: (data: {
    address: string;
    city: string;
    state: string;
    zip: string;
    latitude: number;
    longitude: number;
  }) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({ 
  onPlaceSelected, 
  placeholder = "Start typing address...",
  className = ""
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'us' },
      types: ['address'],
    },
    debounce: 300,
    callbackName: '__googleMapsCallback',
  });

  // Check for Google Maps API availability
  useEffect(() => {
    if (!ready && value) {
      // Check if there's an API error
      if (!window.google?.maps?.places) {
        setApiError('Address search unavailable. Please refresh the page.');
      }
    } else if (ready) {
      setApiError(null);
    }
  }, [ready, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = async (description: string) => {
    console.log('[AddressAutocomplete] Selected:', description);
    setValue(description, false);
    clearSuggestions();
    setIsOpen(false);
    setApiError(null);

    try {
      // Get geocode results
      const results = await getGeocode({ address: description });
      console.log('[AddressAutocomplete] Geocode results:', results);

      if (!results || results.length === 0) {
        console.error('[AddressAutocomplete] No geocode results');
        setApiError('Could not find location details for this address.');
        return;
      }

      // Get lat/lng
      const { lat, lng } = await getLatLng(results[0]);
      console.log('[AddressAutocomplete] Coordinates:', { lat, lng });

      // Parse address components
      const addressComponents = results[0].address_components || [];
      let streetNumber = '';
      let route = '';
      let city = '';
      let state = '';
      let zip = '';

      addressComponents.forEach((component: any) => {
        const types = component.types;
        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        }
        if (types.includes('route')) {
          route = component.long_name;
        }
        if (types.includes('locality')) {
          city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        }
        if (types.includes('postal_code')) {
          zip = component.long_name;
        }
      });

      const streetAddress = `${streetNumber} ${route}`.trim();

      console.log('[AddressAutocomplete] Parsed data:', {
        address: streetAddress,
        city,
        state,
        zip,
        latitude: lat,
        longitude: lng,
      });

      // Call parent handler
      onPlaceSelected({
        address: streetAddress,
        city,
        state,
        zip,
        latitude: lat,
        longitude: lng,
      });
    } catch (error: any) {
      console.error('[AddressAutocomplete] Error:', error);
      if (error.message?.includes('ZERO_RESULTS')) {
        setApiError('No results found for this address.');
      } else if (error.message?.includes('OVER_QUERY_LIMIT')) {
        setApiError('Too many requests. Please try again in a moment.');
      } else if (error.message?.includes('REQUEST_DENIED')) {
        setApiError('Address search is currently unavailable.');
      } else {
        setApiError('Failed to process address. Please try again.');
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInput}
        disabled={!ready}
        placeholder={placeholder}
        className={className}
        onFocus={() => setIsOpen(true)}
      />

      {/* Custom Dropdown */}
      {isOpen && status === 'OK' && data.length > 0 && (
        <ul className="absolute z-[100005] w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion;

            return (
              <li
                key={place_id}
                onClick={() => handleSelect(suggestion.description)}
                className="px-4 py-3 cursor-pointer hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="text-[#00d4aa] font-semibold text-sm">
                    {main_text}
                  </span>
                  <span className="text-slate-400 text-xs mt-0.5">
                    {secondary_text}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* API Error */}
      {apiError && (
        <div className="absolute z-[100005] w-full mt-1 bg-red-900/20 border border-red-500/30 rounded-md shadow-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">{apiError}</span>
          </div>
        </div>
      )}

      {/* No Results / Loading */}
      {isOpen && value && status !== 'OK' && !apiError && (
        <div className="absolute z-[100005] w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg px-4 py-3">
          <div className="flex items-center gap-2">
            {status === 'ZERO_RESULTS' ? (
              <span className="text-slate-400 text-sm">No results found</span>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#00d4aa]" />
                <span className="text-slate-400 text-sm">Searching...</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
