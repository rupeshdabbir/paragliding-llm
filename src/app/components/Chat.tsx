'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `# Welcome to Paragliding AI! 🪂

This tool helps you understand how different factors influence flying decisions. You can ask questions about:
- Current weather conditions
- Flying conditions assessment
- Safety considerations
- Local spot information

**Please Note:** This tool is in alpha stage, so always use your own judgment for flying decisions.

How can I help you today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocoding using OpenStreetMap Nominatim API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          setLocation({
            latitude,
            longitude,
            city: data.address.city || data.address.town || data.address.village,
            country: data.address.country
          });
        } catch (error) {
          console.error('Error getting location details:', error);
          setLocation({ latitude, longitude });
        }
      }, (error) => {
        console.error('Error getting location:', error);
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user' as const, content: input };
    setMessages((prev: Message[]): Message[] => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          location: location 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      const assistantMessage: Message = { role: 'assistant' as const, content: data.response };
      setMessages((prev: Message[]): Message[] => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = { role: 'assistant' as const, content: 'Sorry, there was an error processing your request.' };
      setMessages((prev: Message[]): Message[] => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
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
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2" style={{ position: 'fixed', bottom: '14px', width: '71%' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Paragliding AI..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
          style={{ width: '650px', height: '50px', borderRadius: '13px', padding: '21px', fontSize: 'larger', background: 'white' }}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
} 