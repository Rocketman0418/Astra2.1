import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '../types';

const WEBHOOK_URL = 'https://healthrocket.app.n8n.cloud/webhook/8ec404be-7f51-47c8-8faf-0d139bd4c5e9/chat';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Welcome, I'm Astra. What can I help you with today?",
      isUser: false,
      timestamp: new Date(),
      isCentered: true
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatInput: text.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const responseText = await response.text();
      
      // Try to parse JSON response and extract the output field
      let messageText = responseText;
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.output) {
          messageText = jsonResponse.output;
        }
      } catch (e) {
        // If it's not JSON, use the raw text
        messageText = responseText;
      }

      const astraMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: messageText,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, astraMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const toggleMessageExpansion = useCallback((messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isExpanded: !msg.isExpanded }
          : msg
      )
    );
  }, []);

  return {
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    toggleMessageExpansion,
    messagesEndRef,
    setMessages
  };
};