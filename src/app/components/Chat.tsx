'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import WeatherGauges from './WeatherGauges';
import WeatherChart from './WeatherChart';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  weatherData?: {
    windSpeed: number;
    windDirection: number;
    flightConditions: {
      recommendation: 'High' | 'Medium' | 'Low';
      confidence: number;
    };
    hourlyData?: {
      timestamp: string;
      temperature: string;
      windSpeed: string;
      windDirection: string;
      cloudCover: string;
      visibility: string;
      pressure: string;
    }[];
    date: string;
    dayOfWeek: string;
  };
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

// Sample queries that users can click on
const sampleQueries = [
  "What's the weather like today?",
  "Is it good for flying tomorrow?",
  "What are the conditions this weekend?",
  "Show me the forecast for next week"
];

// Add type definition before markdownComponents
type CodeProps = {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
};

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
  
  // Style code blocks with proper typing
  code: ({node, inline, ...props}: CodeProps) => (
    inline ? 
      <code {...props} className="bg-gray-100 rounded px-1 py-0.5 text-sm font-mono" /> :
      <code {...props} className="block bg-gray-100 rounded p-2 text-sm font-mono overflow-x-auto" />
  ),
  
  // Style blockquotes
  blockquote: ({node, ...props}) => (
    <blockquote {...props} className="border-l-4 border-gray-200 pl-4 italic my-4" />
  ),
};

export default function Chat({ messages, onSendMessage, isLoading }: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleSampleQuery = (query: string) => {
    setInput(query);
  };

  const hasUserMessages = () => {
    return messages.some(msg => msg.role === 'user');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Messages section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] md:max-w-[70%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 shadow-md'
              }`}
            >
              <ReactMarkdown
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
              
              {/* Add WeatherChart if the message contains weather data */}
              {message.role === 'assistant' && message.weatherData && (
                <div className="mt-4">
                  <WeatherChart
                    hourlyData={message.weatherData.hourlyData || []}
                    date={message.weatherData.date}
                    dayOfWeek={message.weatherData.dayOfWeek}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 rounded-lg p-4 shadow-md">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input section */}
      <div className="border-t border-gray-200 bg-white p-4">
        {!hasUserMessages() && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Sample Queries:</h3>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleQuery(query)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors duration-200"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about weather conditions..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 