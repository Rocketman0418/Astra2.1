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
            temperature: 0.7,
            topK: 40,
            maxOutputTokens: 8192,
          }
        });

        const prompt = `You are an expert data visualization developer. Create a comprehensive, interactive HTML visualization for this content: "${messageText}"

CRITICAL REQUIREMENTS:
1. **Complete standalone HTML document** with DOCTYPE, html, head, and body tags
2. **Inline CSS and JavaScript** - no external dependencies
3. **Dark theme**: Background #111827, cards #1f2937, text white, primary accent #3b82f6, secondary #8b5cf6
4. **Multiple interactive charts/graphs** using Canvas API or SVG
5. **Responsive design** that works on mobile and desktop
6. **Professional dashboard layout** with multiple sections
7. **Real data visualization** - extract numbers, trends, categories from the content
8. **Interactive elements**: hover effects, clickable legends, animated transitions
9. **Modern UI**: gradients, shadows, rounded corners, smooth animations
10. **Data insights**: Show trends, comparisons, key metrics prominently

VISUALIZATION TYPES TO INCLUDE (choose 2-3 most relevant):
- Bar charts for comparisons
- Line charts for trends over time
- Pie/donut charts for proportions
- Area charts for cumulative data
- Scatter plots for correlations
- Gauge charts for metrics
- Progress bars for percentages
- Heat maps for intensity data
- Network diagrams for relationships

LAYOUT STRUCTURE:
- Header with title and key metrics
- Grid layout with multiple chart sections
- Interactive legend/controls
- Footer with data source info

STYLING REQUIREMENTS:
- Use CSS Grid and Flexbox for layout
- Smooth CSS transitions (0.3s ease)
- Hover states on all interactive elements
- Loading animations where appropriate
- Mobile-first responsive breakpoints
- Professional typography (system fonts)

JAVASCRIPT FEATURES:
- Chart animations on load
- Interactive tooltips
- Data filtering/sorting
- Smooth transitions between states
- Touch-friendly mobile interactions

Return ONLY the complete HTML code with no explanations, comments, or markdown formatting. The HTML should be production-ready and visually impressive.`;

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

      // Clean up the response to ensure it's valid HTML
      let cleanedContent = content.trim();
      
      // Remove any markdown code blocks if present
      cleanedContent = cleanedContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
      
      // Ensure it starts with DOCTYPE if it's a complete HTML document
      if (!cleanedContent.toLowerCase().includes('<!doctype') && !cleanedContent.toLowerCase().includes('<html')) {
        // If it's just HTML content without document structure, wrap it
        cleanedContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Visualization</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            background: #111827; 
            color: white; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
    </style>
</head>
<body>
    ${cleanedContent}
</body>
</html>`;
      }

      console.log('✅ Visualization generated successfully');

      setVisualizations(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          isGenerating: false,
          content: cleanedContent,
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