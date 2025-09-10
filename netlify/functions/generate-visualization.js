exports.handler = async (event, context) => {
  console.log('=== FUNCTION STARTED ===');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling CORS preflight');
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
    console.log('Method not allowed:', event.httpMethod);
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
    console.log('=== PARSING REQUEST ===');
    const body = event.body;
    console.log('Body exists:', !!body);
    console.log('Body length:', body ? body.length : 0);
    
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
    console.log('Message text length:', messageText ? messageText.length : 0);
    
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

    console.log('=== CHECKING API KEY ===');
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    console.log('API key from env exists:', !!GEMINI_API_KEY);
    console.log('API key length:', GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);
    
    if (!GEMINI_API_KEY) {
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

    console.log('=== PREPARING GEMINI REQUEST ===');
    // Updated to use Gemini 2.5 Flash
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `Create an interactive HTML visualization for this data/message: "${messageText}"

Requirements:
- Complete HTML with inline CSS and JavaScript
- Dark theme (background: #1f2937, text: white, accent: #2563eb)
- Responsive design
- Interactive elements where appropriate
- Professional appearance
- Maximum 10,000 characters

Return only the HTML code, no explanations.`;

    const requestPayload = {
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
    };

    console.log('Request payload size:', JSON.stringify(requestPayload).length, 'bytes');
    
    console.log('=== MAKING GEMINI API REQUEST ===');
    const startTime = Date.now();
    
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });
    
    const requestTime = Date.now() - startTime;
    console.log('=== GEMINI RESPONSE RECEIVED ===');
    console.log('Request completed in:', requestTime, 'ms');
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== GEMINI API ERROR ===');
      console.error('Status:', response.status);
      console.error('Error text:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('=== PROCESSING RESPONSE ===');
    console.log('Response data keys:', Object.keys(responseData));
    console.log('Candidates count:', responseData.candidates?.length);
    
    if (!responseData.candidates || responseData.candidates.length === 0) {
      console.error('No candidates in response');
      throw new Error('No candidates returned from Gemini API');
    }
    
    const candidate = responseData.candidates[0];
    console.log('Finish reason:', candidate.finishReason);
    
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.error('Generation finished with reason:', candidate.finishReason);
    }
    
    const visualizationContent = candidate?.content?.parts?.[0]?.text || 'No visualization could be generated.';
    console.log('=== SUCCESS ===');
    console.log('Generated content length:', visualizationContent.length);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: visualizationContent })
    };

  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: `Failed to generate visualization: ${error.message}`
      })
    };
  }
};