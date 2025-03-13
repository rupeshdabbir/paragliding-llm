'use client';

import { useState } from 'react';
import Chat from './components/Chat';
import { Message } from '../types/chat';
import { sendMessage } from '../services/chatService';

/**
 * Welcome message for new users
 */
const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: `# Welcome to Paragliding AI Assistant! 🪂 - alpha α

I'm here to help you with weather conditions and paragliding advice. Feel free to ask about current conditions or flying recommendations.

Try clicking one of the sample questions below, or ask your own!

**Note:** This tool is in alpha stage, so always use your own judgment for flying decisions.`
};

/**
 * Error message for failed API requests
 */
const ERROR_MESSAGE: Message = {
  role: 'assistant',
  content: 'Sorry, there was an error processing your request.'
};

/**
 * Home page component that manages the chat interface
 */
export default function Home() {
  // Initialize messages with welcome message
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles sending a new message to the chat
   * @param message - The user's message to send
   */
  const handleSendMessage = async (message: string) => {
    // Add user message to chat
    const userMessage: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const assistantMessage = await sendMessage(message);
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, ERROR_MESSAGE]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-4 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-8 text-gray-900">
          Paragliding AI Assistant 
          <span className="ml-2 text-sm sm:text-base font-normal text-gray-600">α - Alpha</span>
        </h1>
        <Chat 
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}
