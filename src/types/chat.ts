/**
 * Represents the flight conditions recommendation level
 */
export type RecommendationLevel = 'High' | 'Medium' | 'Low';

/**
 * Represents the flight conditions data structure
 */
export interface FlightConditions {
  recommendation: RecommendationLevel;
  confidence: number;
}

/**
 * Represents hourly weather data structure
 */
export interface HourlyWeatherData {
  timestamp: string;
  temperature: string;
  windSpeed: string;
  windDirection: string;
  cloudCover: string;
  visibility: string;
  pressure: string;
}

/**
 * Represents weather data associated with a message
 */
export interface WeatherData {
  windSpeed: number;
  windDirection: number;
  flightConditions: FlightConditions;
  hourlyData?: HourlyWeatherData[];
  date: string;
  dayOfWeek: string;
}

/**
 * Represents a chat message with optional weather data
 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  weatherData?: WeatherData;
} 