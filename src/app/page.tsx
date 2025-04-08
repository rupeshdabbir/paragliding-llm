"use client"; // Required for useState and event handlers

import { useState } from 'react';
import Image from "next/image";
import Chat from './components/Chat';
import Autocomplete from 'react-google-autocomplete';

// Define a type for the selected location for better type safety
interface Place {
  formatted_address: string;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  // You can add other properties from the Google Place object if needed
}

export default function Home() {
  // State to hold the selected location details
  const [selectedLocation, setSelectedLocation] = useState<Place | null>(null);

  const handlePlaceSelected = (place: any) => {
    // Basic validation to ensure we have the necessary details
    if (place && place.geometry && place.geometry.location && place.formatted_address) {
      const locationDetails: Place = {
        formatted_address: place.formatted_address,
        geometry: {
          location: {
            lat: () => place.geometry.location.lat(), // lat() and lng() are functions
            lng: () => place.geometry.location.lng(),
          }
        }
      };
      console.log("Selected Location:", locationDetails.formatted_address, `(${locationDetails.geometry.location.lat()}, ${locationDetails.geometry.location.lng()})`);
      setSelectedLocation(locationDetails);
    } else {
      console.error("Selected place object is missing required properties:", place);
      setSelectedLocation(null); // Reset if the place object is invalid
    }
  };

  return (
    // Changed layout to flex column and center items for better alignment
    <main className="min-h-screen bg-gray-50 flex flex-col items-center pt-10">
      <div className="container mx-auto px-4 w-full max-w-2xl"> {/* Constrained width */}
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-gray-900">
          Paragliding AI Assistant
           {/* Simplified the alpha span */}
          <span className="ml-2 text-sm sm:text-base font-normal text-gray-600">α</span>
        </h1>

        {/* Location Autocomplete Input - Shown only if no location is selected */}
        {!selectedLocation && (
          <div className="mb-8 w-full">
            <label htmlFor="location-search" className="block text-sm font-medium text-gray-700 mb-1">
              Search for a Location
            </label>
            <Autocomplete
              id="location-search"
              // IMPORTANT: Replace with your actual Google Places API Key stored in .env.local
              // Make sure it's prefixed with NEXT_PUBLIC_ for client-side access in Next.js
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
              onPlaceSelected={handlePlaceSelected}
              options={{
                types: ["geocode"], // Suggests geographical locations rather than businesses
                // componentRestrictions: { country: "us" }, // Optional: Uncomment to restrict search to the US
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="E.g., Mussel Rock Park, Daly City"
            />
             {/* Basic check to warn if the API key seems missing */}
             {!process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY && (
               <p className="text-xs text-red-600 mt-1">Warning: NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is not set in your environment variables. Location autocomplete will not function.</p>
             )}
          </div>
        )}

        {/* Chat Component - Shown only if a location IS selected */}
        {selectedLocation && (
           <div className="w-full">
             {/* Display selected location and allow changing it */}
             <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-md text-sm text-blue-800 flex justify-between items-center">
               <span>Selected Location: <strong>{selectedLocation.formatted_address}</strong></span>
               <button
                 onClick={() => setSelectedLocation(null)} // Clear the selected location to show search again
                 className="ml-4 text-blue-600 hover:text-blue-800 text-xs font-semibold underline"
               >
                 Change Location
               </button>
             </div>
             {/* Render the Chat component */}
             {/* TODO: You might need to pass the 'selectedLocation' details (like lat/lng) to the Chat component as props */}
             <Chat />
           </div>
        )}
      </div>
    </main>
  );
}
