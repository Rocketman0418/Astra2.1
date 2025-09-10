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

📊 CRITICAL: YOU MUST EXTRACT AND USE THE EXACT NUMERICAL DATA FROM THE MESSAGE TEXT BELOW.
DO NOT USE PLACEHOLDER VALUES LIKE $0.00 OR GENERIC NUMBERS.

        console.log('📄 Raw Gemini response length:', cleanedContent.length);
        console.log('📄 Raw Gemini response preview:', cleanedContent.substring(0, 1000));
REQUIRED DATA TO EXTRACT AND DISPLAY:
- Total Assets: Look for "Total Assets:" followed by dollar amount
- Total Revenue: Look for "Total Revenues:" or "Stripe Revenue" 
- Net Loss/Income: Look for "Net Income (Loss):" with negative values
- Cash Balance: Look for current cash amounts and "Current Assets"
- Monthly Burn Rate: Look for "Monthly Burn Rate" or "burn" calculations
- Cash Runway: Look for "Cash Runway:" and month calculations
- Operating Expenses: Look for "Total Operating Expenses"
- Major expense categories like Travel, Software, Events
- Monthly cash balance trends with specific dates and amounts

EXAMPLE OF WHAT TO LOOK FOR IN THE MESSAGE:
If you see "Total Assets: $217,741.72" → Display exactly $217,741.72
If you see "Net Income (Loss): -$90,661.38" → Display exactly -$90,661.38
If you see "Cash Runway: 7.77 months" → Display exactly 7.77 months
If you see "Total Revenues: $7,896.98" → Display exactly $7,896.98
If you see "Monthly Burn Rate: $11,293.74" → Display exactly $11,293.74

🎨 VISUAL REQUIREMENTS:
- **Complete standalone HTML** with DOCTYPE, head, body
- **Dark theme**: #111827 background, #1f2937 cards, white text, #3b82f6/#8b5cf6 accents
- **ACTUAL WORKING CHARTS** using Canvas API, SVG, or CSS animations
- **Interactive elements**: hover effects, clickable areas, animated counters
- **Icons & graphics**: Use CSS shapes, SVG icons, emojis, visual metaphors
- **Responsive design**: Works on mobile and desktop

🔍 DATA PARSING INSTRUCTIONS:
1. Read through the entire message text carefully
2. Find each financial figure mentioned with its label
3. Extract the exact number including dollar signs and decimals
4. Use these exact figures in your visualization - NO APPROXIMATIONS

📈 CREATE REAL CHARTS (not placeholders):
- Animated bar charts with actual data bars
- Line graphs with plotted points and curves  
- Pie charts with colored segments and percentages
- Progress bars that fill to actual values
- Gauge meters with moving needles
- Interactive timelines with events
- Comparison tables with visual indicators
- Trend arrows and status indicators

⚡ INTERACTIVITY & ANIMATION:
- Charts animate on page load
- Hover tooltips with detailed info
- Clickable legends that highlight data
- Smooth transitions and micro-interactions
- Loading animations for visual appeal
- Touch-friendly mobile interactions

🎪 VISUAL STORYTELLING:
- Use colors to convey meaning (red=negative, green=positive)
- Add visual hierarchy with typography and spacing
- Include relevant emojis and icons
- Create visual flow that guides the eye
- Use gradients, shadows, and modern effects

💻 TECHNICAL SPECS:
- Pure HTML/CSS/JavaScript (no external libraries)
- Canvas API or SVG for complex charts
- CSS Grid/Flexbox for layout
- Smooth CSS transitions (0.3s ease)
- Mobile-first responsive breakpoints

🚀 MAKE IT IMPRESSIVE:
- Professional dashboard appearance
- Multiple chart types in one view
- Real data extracted from the message
- Visually stunning and informative
- Production-ready quality

Create actual working charts, graphs, and visual elements using HTML5 Canvas, SVG, or CSS. Include:
- Interactive bar charts, line graphs, pie charts where data exists
- Visual progress bars, gauges, and meters
- Icons, emojis, and visual metaphors
- Animated elements and hover effects
- Color-coded sections (red for negative, green for positive)
- Visual hierarchy with proper spacing and typography

Make it visually engaging with real graphics, not just text layouts.

Return ONLY the complete HTML code. Make it visually spectacular with REAL working charts and data visualization!`;

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