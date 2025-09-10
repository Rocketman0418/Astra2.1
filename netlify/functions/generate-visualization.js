exports.handler = async (event, context) => {
  console.log('Function started, method:', event.httpMethod);
  
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

    // Updated to use Gemini 2.5 Flash
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log('Making request to Gemini 2.5 Flash API...');

    const prompt = `Based on the message text, generate a brief yet comprehensive graphic visualization to help me better understand the information. Use the color scheme that matches the app's design (dark theme with blue gradients from #2563eb to #7c3aed, gray backgrounds from #374151 to #1f2937, and white text).

Message text: ${messageText}

Requirements:
- Generate only the inner HTML content for the visualization (no DOCTYPE, html, head, or body tags)
- Include all CSS inline using style attributes
- Use the app's color scheme: dark backgrounds (#1f2937, #374151), blue-purple gradients (#2563eb to #7c3aed), white text
- Create a brief visual representation or summary
- Keep it simple and focused
- Ensure it's responsive and works on mobile devices

The output should be simple, self-contained HTML content that can be inserted into an existing page structure.`;
    const prompt = `Create a simple HTML visualization for this text: "${messageText}"

Requirements:
- Only HTML with inline CSS (no external scripts)
- Dark theme: background #1f2937, text white, blue accents #2563eb
- Maximum 200 words of content
- Simple layout with divs and basic styling`;

    console.log('Sending request to Gemini 2.5 Flash...');
    
    const response = await fetch(GEMINI_URL, {
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
          maxOutputTokens: 8192
        }
      })
    });

    console.log('Gemini API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, response.statusText, errorText);
      throw new Error('Failed to generate visualization');
    }

    const data = await response.json();
    console.log('Gemini API response received, candidates:', data.candidates?.length);
    
    const visualizationContent = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No visualization could be generated.';
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