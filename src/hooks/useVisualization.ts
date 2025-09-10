import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
      // Get API key from environment
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Gemini API key not found');
      }

      // Initialize Gemini AI directly
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 10800,
        }
      });

      const prompt = `Create an interactive HTML visualization for this data/message: "${messageText}"

Requirements:
- Complete HTML with inline CSS and JavaScript
- Dark theme (background: #1f2937, text: white, accent: #2563eb)
- Responsive design
- Interactive elements where appropriate
- Professional appearance
- Use charts, graphs, or visual elements as appropriate for the data
- Maximum 10,000 characters

Return only the HTML code, no explanations.`;

      console.log('🤖 Generating visualization with Gemini...');
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      const content = response.candidates[0].content?.parts?.[0]?.text;
      
      if (!content) {
        throw new Error('Empty response from Gemini API');
      }

      console.log('✅ Visualization generated successfully');

      setVisualizations(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          isGenerating: false,
          content: content,
          isVisible: false
        }
      }));

      // Auto-show the visualization after generation
      setCurrentVisualization(messageId);
      
    } catch (error) {
      console.error('Error generating visualization:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setVisualizations(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          isGenerating: false,
          content: `<div style="padding: 20px; text-align: center; color: #ef4444; background: #1f2937; border-radius: 8px;">
            <h3>Failed to generate visualization</h3>
            <p>Error: ${errorMessage}</p>
            <p>Please try again.</p>
          </div>`,
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