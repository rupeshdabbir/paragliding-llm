import { Message, WeatherData } from '../types/chat';

interface Location {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

interface ChatResponse {
  response: string;
  weatherData?: WeatherData;
  error?: string;
}

/**
 * Default location for the application
 */
const DEFAULT_LOCATION: Location = {
  latitude: 37.7749,
  longitude: -122.4194,
  city: 'San Francisco',
  country: 'USA'
};

/**
 * Processes weather data from the API response
 * @param data - Raw weather data from the API
 * @returns Processed weather data or undefined if not present
 */
const processWeatherData = (data: any): WeatherData | undefined => {
  if (!data?.weatherData) return undefined;

  // Hourly data is already parsed in the API route
  const hourlyData = data.weatherData.hourlyData || [];

  return {
    windSpeed: data.weatherData.windSpeed || 0,
    windDirection: data.weatherData.windDirection || 0,
    flightConditions: {
      recommendation: data.weatherData.flightConditions.recommendation || 'Low',
      confidence: data.weatherData.flightConditions.confidence || 0
    },
    hourlyData,
    date: data.weatherData.date,
    dayOfWeek: data.weatherData.dayOfWeek
  };
};

/**
 * Sends a message to the chat API
 * @param message - The user's message
 * @param location - Optional location data (defaults to San Francisco)
 * @returns Promise containing the API response
 */
export const sendMessage = async (message: string, location: Location = DEFAULT_LOCATION): Promise<Message> => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, location }),
  });

  const data: ChatResponse = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to process message');
  }

  return {
    role: 'assistant',
    content: data.response,
    weatherData: processWeatherData(data)
  };
}; 