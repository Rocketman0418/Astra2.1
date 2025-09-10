import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  console.log('🚀 Function started');
  
  try {
    const startTime = Date.now();
    
    // Parse request body
    const body = await request.json();
    console.log('📝 Request body received:', { 
      messageLength: body.messageText?.length || 0,
      bodySize: JSON.stringify(body).length 
    });
    
    const { messageText } = body;
    
    if (!messageText) {
      console.log('❌ No message text provided');
      return new Response(JSON.stringify({ 
        error: 'Message text is required',
        content: '<div style="padding: 20px; text-align: center; color: #ef4444;">No message text provided</div>'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get API key
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    console.log('🔑 API key status:', apiKey ? 'Present' : 'Missing');
    
    if (!apiKey) {
      console.log('❌ No API key found');
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        content: '<div style="padding: 20px; text-align: center; color: #ef4444;">API key not configured</div>'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Gemini
    console.log('🤖 Initializing Gemini...');
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

    const prompt = `Create an interactive HTML visualization for: "${messageText}". Return only complete HTML with inline CSS/JS. Make it visually engaging with animations, charts, or interactive elements as appropriate.`;

    console.log('📤 Sending request to Gemini...');
    const geminiStartTime = Date.now();
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini request timed out')), 23000);
    });

    // Make the request with timeout
    const resultPromise = model.generateContent(prompt);
    const result = await Promise.race([resultPromise, timeoutPromise]);
    
    const geminiEndTime = Date.now();
    console.log(`⏱️ Gemini response time: ${geminiEndTime - geminiStartTime}ms`);

    const response = await result.response;
    console.log('📥 Gemini response received');
    
    if (!response.candidates || response.candidates.length === 0) {
      console.log('❌ No candidates in response');
      throw new Error('No response candidates from Gemini');
    }

    const candidate = response.candidates[0];
    console.log('🔍 Candidate finish reason:', candidate.finishReason);
    
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.log('❌ No content parts in candidate');
      throw new Error('No content in response');
    }

    const content = candidate.content.parts[0].text;
    console.log('✅ Content generated:', { length: content?.length || 0 });

    if (!content) {
      throw new Error('Empty content from Gemini');
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Function completed successfully in ${totalTime}ms`);

    return new Response(JSON.stringify({ 
      content,
      generationTime: totalTime
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const totalTime = Date.now() - Date.now();
    console.error('💥 Function error:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ 
      error: `Failed to generate visualization: ${errorMessage}`,
      content: '<div style="padding: 20px; text-align: center; color: #ef4444;">Failed to generate visualization. Please try again.</div>'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}