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
    const body = event.body;
    console.log('Raw body:', body ? body.substring(0, 100) + '...' : 'null');
    
    if (!body) {
      console.log('No request body provided');
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }
    
    const { messageText } = JSON.parse(body);
    
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
    console.log('Request payload size:', JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 10800,
        topK: 40,
        topP: 0.95
      }
    }).length, 'bytes');

    const prompt = `Create HTML visualization for: "${messageText.substring(0, 200)}"

Output only HTML with inline CSS. Dark theme: bg #1f2937, text white, blue #2563eb. Max 3 divs.`;
    console.log('Message text length:', messageText.length);
    console.log('Prompt length:', prompt.length);
    
    console.log('Starting Gemini API request...');
    const startTime = Date.now();
    
    const response = await Promise.race([
      fetch(GEMINI_URL, {
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
          temperature: 0.3,
          maxOutputTokens: 10800,
          topK: 40,
          topP: 0.95
        }
      })
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API request timed out after 23 seconds')), 23000)
      )
    ]);
    
    const requestTime = Date.now() - startTime;
    console.log('Gemini API request completed in:', requestTime, 'ms');

    // Add a race condition with timeout to handle Netlify's function timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), 24000); // 24 second timeout for Pro plan
    });

    console.log('Response received, status:', response.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('Response data structure:', Object.keys(responseData));

    console.log('Gemini API response status:', response.status);
    
    const data = responseData;
    console.log('Gemini API response received, candidates:', data.candidates?.length);
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response:', JSON.stringify(data));
      throw new Error('No candidates returned from Gemini API');
    }
    
    if (data.candidates[0].finishReason && data.candidates[0].finishReason !== 'STOP') {
      console.error('Generation finished with reason:', data.candidates[0].finishReason);
      console.error('Full candidate:', JSON.stringify(data.candidates[0]));
    }
    
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
    
    // If it's a timeout, provide a simpler fallback visualization
    if (error.message.includes('timed out')) {
      const fallbackVisualization = `
        <div style="padding: 20px; background: #1f2937; color: white; border-radius: 8px;">
          <h3 style="color: #2563eb; margin: 0 0 12px 0;">📊 Summary</h3>
          <div style="background: #374151; padding: 12px; border-radius: 6px;">
            <p style="margin: 0; color: #d1d5db;">${messageText.substring(0, 150)}${messageText.length > 150 ? '...' : ''}</p>
          </div>
        </div>
      `;
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: fallbackVisualization })
      };
    }
    
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