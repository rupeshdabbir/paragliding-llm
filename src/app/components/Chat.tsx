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

  const markdownComponents: Components = {
    code: ({ className, children }) => {
      const match = /language-(\w+)/.exec(className || '');
      return match ? (
        <SyntaxHighlighter
          style={atomDark as any}
          language={match[1]}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className}>
          {children}
        </code>
      );
    },
    p: ({ children }) => <p className="mb-2">{children}</p>,
    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
    ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,
    a: ({ href, children }) => (
      <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
        {children}
      </blockquote>
    ),
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
      {/* Messages Section */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-20">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.role === 'assistant' ? (
                <>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                  {message.weatherData && (
                    <div className="mt-4 border-t pt-4">
                      <WeatherGauges
                        windSpeed={message.weatherData.windSpeed}
                        windDirection={message.weatherData.windDirection}
                        flightConditions={message.weatherData.flightConditions}
                      />
                    </div>
                  )}
                </>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
              Thinking... 🪂
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom section containing sample queries and input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto">
          {/* Sample Queries Section */}
          {!hasUserMessages() && (
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-500">Try asking:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sampleQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSampleQuery(query)}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 
                             text-gray-700 rounded-full text-sm border 
                             border-gray-200 transition-colors duration-200
                             hover:border-gray-300 focus:outline-none 
                             focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Paragliding AI..."
                className="flex-1 p-2 border border-gray-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         shadow-sm"
                disabled={isLoading}
                style={{ height: '50px', borderRadius: '13px', padding: '21px', fontSize: 'larger' }}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg 
                         hover:bg-blue-600 disabled:opacity-50 
                         disabled:cursor-not-allowed font-medium
                         shadow-sm transition-colors duration-200"
                style={{ height: '50px' }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 