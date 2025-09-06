import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

export async function generateAnswer(
  query: string, 
  context: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  try {
    // Build messages array with system prompt
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions based on the provided PDF content. 
                 Use the conversation history to maintain context and provide relevant follow-up answers.
                 Use only the information from the context provided. If the answer cannot be found in the context, 
                 say "I cannot find information about that in the provided document."
                 Be conversational and reference previous parts of the conversation when relevant.`
      }
    ];

    // Add conversation history if provided (excluding the current question)
    if (conversationHistory && conversationHistory.length > 0) {
      // Add historical messages (but not the latest user message which is the current query)
      const historyMessages = conversationHistory.slice(0, -1);
      messages.push(...historyMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }

    // Add current context and question
    messages.push({
      role: 'user',
      content: `Context from document: ${context}\n\nQuestion: ${query}`
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.3,
      max_tokens: 800, // Increased for conversational responses
    });
    
    return response.choices[0].message.content || 'Sorry, I could not generate an answer.';
  } catch (error) {
    console.error('Error generating answer:', error);
    throw new Error('Failed to generate answer');
  }
}