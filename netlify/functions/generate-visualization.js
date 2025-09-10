exports.handler = async (event, context) => {
  console.log('Function started, method:', event.httpMethod);
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    console.log('Parsing request body...');
    const { messageText } = JSON.parse(event.body);
    
    if (!messageText) {
      console.log('No message text provided');
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Message text is required' })
      };
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    // For local development through Vite proxy, check headers
    const apiKey = GEMINI_API_KEY || event.headers['x-gemini-api-key'];
    
    console.log('API key exists:', !!apiKey);
    console.log('API key source:', GEMINI_API_KEY ? 'GEMINI_API_KEY' : event.headers['x-gemini-api-key'] ? 'header' : 'none');
    
    if (!apiKey) {
      console.log('Gemini API key not found in environment');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Gemini API key not configured' })
      };
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log('Making request to Gemini API...');

    const prompt = `You are a data visualization expert. Create a complete, working HTML page with inline CSS and JavaScript that visualizes the following data.

${messageText}

Requirements:
- Create a complete HTML page with <!DOCTYPE html>, <html>, <head>, and <body> tags
- Include all CSS inline in <style> tags within the <head>
- Include all JavaScript inline in <script> tags

The output should be a complete, self-contained HTML file that can be opened directly in a browser.`;

    console.log('Sending request to Gemini...');
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 23000); // 23 seconds to stay under Netlify's 26s limit
    
    let response;
    try {
      response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 1,
            maxOutputTokens: 16384,
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Request timed out after 25 seconds');
        throw new Error('Request timed out');
      }
      throw error;
    }

    console.log('Gemini API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, response.statusText, errorText);
      throw new Error('Failed to generate visualization');
    }

    const data = await response.json();
    console.log('Gemini API response received, candidates:', data.candidates?.length);
    console.log('Full Gemini response:', JSON.stringify(data, null, 2));
    
    // Check if response was truncated due to token limits
    if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      console.log('Response was truncated due to MAX_TOKENS');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Response was truncated. Please try with a shorter message.',
          content: '<div style="padding: 20px; text-align: center; color: #ef4444;">Response was too long and was truncated. Please try with a shorter message.</div>'
        })
      };
    }
    
    const visualizationContent = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No visualization could be generated.';
    console.log('Extracted content:', visualizationContent);
    console.log('Content length:', visualizationContent.length);

    console.log('Successfully generated visualization, length:', visualizationContent.length);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: visualizationContent })
    };

  } catch (error) {
    console.error('Function error:', error.message, error.stack);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: `Failed to generate visualization: ${error.message}`,
        content: '<div style="padding: 20px; text-align: center; color: #ef4444;">Failed to generate visualization. Please try again.</div>'
      })
    };
  }
};