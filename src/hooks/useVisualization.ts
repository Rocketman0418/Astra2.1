import { useState, useCallback } from 'react';
import { VisualizationState } from '../types';

export const useVisualization = () => {
  const [visualizations, setVisualizations] = useState<Record<string, VisualizationState>>({});
  const [currentVisualization, setCurrentVisualization] = useState<string | null>(null);

  const generateVisualization = useCallback(async (messageId: string, messageText: string) => {
    // Truncate very long messages to speed up processing
    const truncatedText = messageText.length > 1000 
      ? messageText.substring(0, 1000) + '...'
      : messageText;

    setVisualizations(prev => ({
      ...prev,
      [messageId]: {
        messageId,
        isGenerating: true,
        content: null,
        isVisible: false
      }
    }));

    try {
      const apiUrl = import.meta.env.DEV 
        ? '/api/generate-visualization' 
        : '/.netlify/functions/generate-visualization';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageText: truncatedText })
      });

      if (!response.ok) {
        throw new Error('Failed to generate visualization');
      }

      const data = await response.json();
      const visualizationContent = data.content || 'No visualization could be generated.';

      setVisualizations(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          isGenerating: false,
          content: visualizationContent,
          isVisible: false
        }
      }));
    } catch (error) {
      console.error('Error generating visualization:', error);
      setVisualizations(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          isGenerating: false,
          content: '<div style="padding: 20px; text-align: center; color: #ef4444;">Failed to generate visualization. Please try again.</div>',
          isVisible: false
        }
      }));
    }
  }, []);

  const showVisualization = useCallback((messageId: string) => {
    setCurrentVisualization(messageId);
    setVisualizations(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        isVisible: true
      }
    }));
  }, []);

  const hideVisualization = useCallback(() => {
    setCurrentVisualization(null);
  }, []);

  const getVisualization = useCallback((messageId: string) => {
    return visualizations[messageId] || null;
  }, [visualizations]);

  return {
    generateVisualization,
    showVisualization,
    hideVisualization,
    getVisualization,
    currentVisualization
  };
};