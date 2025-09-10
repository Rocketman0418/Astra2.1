import { useState, useCallback } from 'react';
import { VisualizationState } from '../types';

export const useVisualization = () => {
  const [visualizations, setVisualizations] = useState<Record<string, VisualizationState>>({});
  const [currentVisualization, setCurrentVisualization] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateVisualization = useCallback(async (messageId: string, messageText: string) => {
    setIsGenerating(true);

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
      // Use Vite API route for development
      const apiUrl = '/api/visualization';
      
      console.log('Making request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(import.meta.env.VITE_GEMINI_API_KEY && {
            'x-gemini-api-key': import.meta.env.VITE_GEMINI_API_KEY
          })
        },
        body: JSON.stringify({ messageText })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Visualization API error:', response.status, errorText);
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

      // Auto-show the visualization after generation
      setCurrentVisualization(messageId);
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
    } finally {
      setIsGenerating(false);
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
    currentVisualization,
    isGenerating
  };
};