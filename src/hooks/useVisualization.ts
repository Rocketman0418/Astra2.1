import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VisualizationState } from '../types';

export const useVisualization = () => {
  const [visualizations, setVisualizations] = useState<Record<string, VisualizationState>>({});
  const [currentVisualization, setCurrentVisualization] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateVisualization = useCallback(async (messageId: string, messageText: string) => {
    setIsGenerating(true);

    // Debug: Log the full message text being sent to Gemini
    console.log('📊 Full message text being sent to Gemini:', messageText);
    console.log('📊 Message text length:', messageText.length);

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
          model: "gemini-2.5-flash",
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            maxOutputTokens: 100000,
          }
        });


        const prompt = `Based on the message text below, generate a comprehensive graphic visualization dashboard to help understand the financial information. 
🎯 MISSION: Create a stunning, interactive data visualization that brings the content to life with actual working charts, graphs, and visual elements.
        // Determine the type of content and create appropriate visualization
        const isFinancialData = messageText.toLowerCase().includes('total assets') || 
                               messageText.toLowerCase().includes('revenue') || 
                               messageText.toLowerCase().includes('cash') || 
                               messageText.toLowerCase().includes('expenses') ||
                               messageText.toLowerCase().includes('profit') ||
                               messageText.toLowerCase().includes('loss');

        let prompt = '';

        if (isFinancialData) {
          // Financial visualization prompt
          prompt = `Based on the financial message text below, create a comprehensive financial dashboard visualization.

🎯 MISSION: Extract the EXACT financial data from the message and create stunning interactive charts.

📊 CRITICAL DATA EXTRACTION - USE THESE EXACT VALUES:
${messageText.includes('Total Assets: $') ? `- Total Assets: ${messageText.match(/Total Assets:\s*\$([0-9,]+\.?[0-9]*)/)?.[0] || 'EXTRACT FROM TEXT'}` : ''}
${messageText.includes('Total Revenues: $') ? `- Total Revenue: ${messageText.match(/Total Revenues:\s*\$([0-9,]+\.?[0-9]*)/)?.[0] || 'EXTRACT FROM TEXT'}` : ''}
${messageText.includes('Net Income (Loss): -$') ? `- Net Loss: ${messageText.match(/Net Income \(Loss\):\s*-?\$([0-9,]+\.?[0-9]*)/)?.[0] || 'EXTRACT FROM TEXT'}` : ''}
${messageText.includes('Cash Runway:') ? `- Cash Runway: ${messageText.match(/Cash Runway:\s*\$?([0-9,]+\.?[0-9]*)\s*months?/)?.[0] || 'EXTRACT FROM TEXT'} months` : ''}
${messageText.includes('Monthly Burn Rate:') ? `- Monthly Burn: ${messageText.match(/Monthly Burn Rate:\s*\$([0-9,]+\.?[0-9]*)/)?.[0] || 'EXTRACT FROM TEXT'}` : ''}
${messageText.includes('Current Assets:') ? `- Current Cash: ${messageText.match(/Current Assets:\s*\$([0-9,]+\.?[0-9]*)/)?.[0] || 'EXTRACT FROM TEXT'}` : ''}

🔍 STEP-BY-STEP DATA EXTRACTION:
1. Search for "Total Assets: $" and extract the dollar amount after it
2. Search for "Total Revenues: $" and extract the dollar amount  
3. Search for "Net Income (Loss): -$" and extract the loss amount
4. Search for "Cash Runway:" and extract the months value
5. Search for "Monthly Burn Rate: $" and extract the burn amount
6. Search for "Current Assets: $" and extract the cash amount
7. Use these EXACT values in your charts - NO PLACEHOLDERS!

🎨 VISUAL REQUIREMENTS:
- Complete standalone HTML with dark theme (#111827 background)
- Real working charts using Canvas API or SVG
- Interactive elements with hover effects
- Professional financial dashboard appearance
- Color coding: red for losses, green for positive, blue for neutral

MESSAGE TEXT TO ANALYZE:
${messageText}

Return ONLY complete HTML code with actual financial data extracted and visualized.`;
        } else {
          // Non-financial visualization prompt
          prompt = `Based on the message text below, create an appropriate interactive visualization dashboard.

🎯 MISSION: Analyze the content type and create a relevant visual representation.

CONTENT ANALYSIS:
- If it's about meetings: Create a meeting insights dashboard
- If it's about strategy: Create a strategic overview visualization  
- If it's about projects: Create a project status dashboard
- If it's about team updates: Create a team activity visualization

🎨 VISUAL REQUIREMENTS:
- Complete standalone HTML with dark theme (#111827 background)
- Interactive elements and modern design
- Relevant icons, charts, and visual elements
- Professional dashboard appearance
- Color-coded sections for different topics

📊 CREATE APPROPRIATE VISUALIZATIONS:
- Timeline charts for meeting discussions
- Progress indicators for project status
- Network diagrams for team connections
- Flowcharts for strategic processes
- Interactive cards for key insights

MESSAGE TEXT TO VISUALIZE:
${messageText}

Return ONLY complete HTML code with contextually appropriate visualization.`;
        }

      console.log('🤖 Generating visualization with Gemini...');
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let cleanedContent = response.text();

      // Clean up the response - remove markdown code blocks if present
      cleanedContent = cleanedContent.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

      // Ensure it starts with DOCTYPE if it's a complete HTML document
      if (!cleanedContent.toLowerCase().includes('<!doctype') && !cleanedContent.toLowerCase().includes('<html')) {
        cleanedContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualization</title>
    <style>
        body { 
            background: #111827; 
            color: white; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
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

      // Automatically show the visualization after generation
      setCurrentVisualization(messageId);
    } catch (error) {
      console.error('❌ Error generating visualization:', error);
      
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