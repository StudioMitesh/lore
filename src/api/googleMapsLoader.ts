let mapsApiLoaded: Promise<void> | null = null;
let apiKey: string | null = null;

const getGoogleMapsApiKey = async (): Promise<string> => {
  if (apiKey) return apiKey;
  
  try {
    const response = await fetch('/.netlify/functions/google-maps-key');
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Maps API key: ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    apiKey = data.apiKey;
    return apiKey || "";
  } catch (error) {
    console.error('Error fetching Google Maps API key:', error);
    throw error;
  }
};

export const loadGoogleMapsApi = async (): Promise<void> => {
  if (typeof window === "undefined") return Promise.reject("Not in browser");
  if (window.google?.maps) return Promise.resolve();
  
  if (!mapsApiLoaded) {
    mapsApiLoaded = new Promise(async (resolve, reject) => {
      try {
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve());
          existingScript.addEventListener("error", () => reject("Failed to load Google Maps API"));
          return;
        }

        const key = await getGoogleMapsApiKey();
        
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject("Failed to load Google Maps API");
        document.head.appendChild(script);
      } catch (error) {
        reject(`Failed to load Google Maps API: ${error}`);
      }
    });
  }
  
  return mapsApiLoaded;
};