import React, { useEffect } from 'react';
import { Header } from './Header';
import { MessageBubble } from './MessageBubble';
import { LoadingIndicator } from './LoadingIndicator';
import { ChatInput } from './ChatInput';
import { VisualizationView } from './VisualizationView';
import { VisualizationLoadingView } from './VisualizationLoadingView';
import { useChat } from '../hooks/useChat';
import { useVisualization } from '../hooks/useVisualization';

export const ChatContainer: React.FC = () => {
  const {
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    toggleMessageExpansion,
    messagesEndRef
  } = useChat();

  const {
    generateVisualization,
    showVisualization,
    hideVisualization,
    getVisualization,
    currentVisualization,
    isGenerating
  } = useVisualization();
  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  // Handle viewport adjustments for mobile keyboards
  useEffect(() => {
    const handleResize = () => {
      // Force scroll to bottom when keyboard appears/disappears
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [messagesEndRef]);

  // Show loading view when generating visualization
  if (isGenerating) {
    return <VisualizationLoadingView />;
  }

  // Show visualization view if one is currently active
  if (currentVisualization) {
    const visualization = getVisualization(currentVisualization);
    if (visualization?.content) {
      return (
        <VisualizationView
          content={visualization.content}
          onBack={hideVisualization}
        />
      );
    }
  }
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <Header />
      
      <div className="flex-1 overflow-y-auto pt-12 pb-20 md:pb-24 px-3 md:px-4">
        <div className="max-w-4xl mx-auto space-y-3 md:space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onToggleExpansion={toggleMessageExpansion}
              onCreateVisualization={generateVisualization}
              onViewVisualization={showVisualization}
              visualizationState={getVisualization(message.id)}
            />
          ))}
          
          {isLoading && <LoadingIndicator />}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={sendMessage}
        disabled={isLoading}
      />
    </div>
  );
};