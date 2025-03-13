'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import WeatherGauges from './WeatherGauges';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  weatherData?: {
    windSpeed: number;
    windDirection: number;
    flightConditions: {
      recommendation: 'Low' | 'Medium' | 'High';
      confidence: number;
    };
  };
}

// Sample queries that users can click on
const sampleQueries = [
  "Can I fly in Mussel Rock today?",
  "What's the weather like in Mussel Rock tomorrow?",
  "Is it good to fly in Ed Levin this weekend?",
  "How's the wind at Alameda right now?",
  "What are the conditions at Blue Rock on Friday?"
];

// Define markdown components with proper styling
const markdownComponents: Components = {
  // Style headings
  h1: ({node, ...props}) => <h1 {...props} className="text-2xl font-bold mb-4" />,
  h2: ({node, ...props}) => <h2 {...props} className="text-xl font-bold mb-3" />,
  h3: ({node, ...props}) => <h3 {...props} className="text-lg font-bold mb-2" />,
  
  // Style paragraphs
  p: ({node, ...props}) => <p {...props} className="text-sm sm:text-base mb-4 last:mb-0" />,
  
  // Style links
  a: ({node, ...props}) => (
    <a {...props} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" />
  ),
  
  // Style lists
  ul: ({node, ...props}) => <ul {...props} className="list-disc list-inside mb-4" />,
  ol: ({node, ...props}) => <ol {...props} className="list-decimal list-inside mb-4" />,
  li: ({node, ...props}) => <li {...props} className="mb-1" />,
  
  // Style code blocks
  code: ({node, inline, ...props}) => (
    inline ? 
      <code {...props} className="bg-gray-100 rounded px-1 py-0.5 text-sm font-mono" /> :
      <code {...props} className="block bg-gray-100 rounded p-2 text-sm font-mono overflow-x-auto" />
  ),
  
  // Style blockquotes
  blockquote: ({node, ...props}) => (
    <blockquote {...props} className="border-l-4 border-gray-200 pl-4 italic my-4" />
  ),
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `# Welcome to Paragliding AI! 🪂

I'm here to help you with weather conditions and paragliding advice. Feel free to ask about current conditions or flying recommendations.

Try clicking one of the sample questions below, or ask your own!

**Note:** This tool is in alpha stage, so always use your own judgment for flying decisions.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          location: { 
            latitude: 37.7749,
            longitude: -122.4194,
            city: 'San Francisco',
            country: 'USA'
          }
        }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      const weatherData = data.weatherData ? {
        windSpeed: data.weatherData.windSpeed || 0,
        windDirection: data.weatherData.windDirection || 0,
        flightConditions: {
          recommendation: data.weatherData.flightConditions.recommendation || 'Low',
          confidence: data.weatherData.flightConditions.confidence || 0
        }
      } : undefined;

      const assistantMessage: Message = { 
        role: 'assistant',
        content: data.response,
        weatherData
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = { 
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.'
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle clicking a sample query
  const handleSampleQuery = (query: string) => {
    setInput(query);
  };

  // Add a function to check if there are any user messages
  const hasUserMessages = () => {
    return messages.some(message => message.role === 'user');
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-gray-50">
      {/* Main chat container */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        {/* Messages container with improved spacing */}
        <div className="space-y-6 py-8">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                message.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm
                  ${message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-900 border border-gray-100'
                  }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm sm:prose-base max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {message.content}
                    </ReactMarkdown>
                    {message.weatherData && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <WeatherGauges
                          windSpeed={message.weatherData.windSpeed}
                          windDirection={message.weatherData.windDirection}
                          flightConditions={message.weatherData.flightConditions}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm sm:text-base">{message.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="animate-pulse flex space-x-1">
                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <span className="text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom section with glass effect */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto w-full">
          {/* Sample Queries Section */}
          {!hasUserMessages() && (
            <div className="px-4 sm:px-6 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-500 font-medium">Try asking:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sampleQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSampleQuery(query)}
                    className="px-3 py-1.5 bg-gray-50/80 hover:bg-gray-100 
                             text-gray-700 rounded-full text-xs sm:text-sm border 
                             border-gray-200 transition-all duration-200
                             hover:border-gray-300 hover:shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 
                             focus:ring-opacity-50 active:scale-95"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form with responsive design */}
          <div className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message Paragliding AI..."
                  className="w-full h-12 sm:h-14 pl-4 pr-12 py-2 
                           text-base sm:text-lg bg-gray-50/80
                           border border-gray-200 rounded-2xl
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent transition-all duration-200
                           placeholder-gray-400"
                  disabled={isLoading}
                />
                {input.length > 0 && (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2
                             w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center
                             bg-blue-500 text-white rounded-xl
                             hover:bg-blue-600 disabled:opacity-50
                             disabled:cursor-not-allowed transition-all
                             duration-200 shadow-sm hover:shadow
                             active:scale-95"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      className="w-5 h-5"
                    >
                      <path 
                        d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 