import { openai } from './openai';

export interface QueryAnalysis {
  originalQuery: string;
  expandedQuery: string;
  intent: 'question' | 'summary' | 'comparison' | 'definition' | 'instruction' | 'complex';
  entities: string[];
  keywords: string[];
  confidence: number;
}

export interface ContextChunk {
  text: string;
  score: number;
  documentId: string;
  chunkIndex: number;
  metadata?: any;
}

export interface EnhancedAnswer {
  answer: string;
  confidence: number;
  sources: string[];
  relatedQuestions: string[];
  reasoning: string;
  chunks: ContextChunk[];
}

// Query expansion using LLM
export async function expandQuery(query: string): Promise<QueryAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: `You are a query analysis expert. Analyze the user's query and provide:
        1. Intent classification (question/summary/comparison/definition/instruction/complex)
        2. Key entities and concepts
        3. Important keywords for search
        4. Query expansion with synonyms and related terms
        5. Confidence score (0-1) for how well you understand the query
        
        Respond in JSON format only.`
      }, {
        role: 'user',
        content: `Analyze this query: "${query}"`
      }],
      temperature: 0.1,
      max_tokens: 500,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      originalQuery: query,
      expandedQuery: analysis.expandedQuery || query,
      intent: analysis.intent || 'question',
      entities: analysis.entities || [],
      keywords: analysis.keywords || [],
      confidence: analysis.confidence || 0.5
    };
  } catch (error) {
    console.error('Query expansion failed:', error);
    return {
      originalQuery: query,
      expandedQuery: query,
      intent: 'question',
      entities: [],
      keywords: [],
      confidence: 0.5
    };
  }
}

// Semantic reranking of search results
export async function rerankContexts(query: string, contexts: ContextChunk[]): Promise<ContextChunk[]> {
  if (contexts.length <= 1) return contexts;

  try {
    // Use cross-encoder style reranking with LLM
    const rerankPromises = contexts.map(async (context, index) => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `You are a relevance scorer. Rate how relevant this text is to answering the query on a scale of 0-100. Return only the numeric score.`
        }, {
          role: 'user',
          content: `Query: "${query}"\n\nText: "${context.text.substring(0, 1000)}..."\n\nRelevance score (0-100):`
        }],
        temperature: 0.1,
        max_tokens: 10,
      });

      const score = parseInt(response.choices[0].message.content?.trim() || '50');
      return {
        ...context,
        score: score / 100 // Normalize to 0-1
      };
    });

    const rerankedContexts = await Promise.all(rerankPromises);
    return rerankedContexts.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Context reranking failed:', error);
    return contexts;
  }
}

// Multi-hop reasoning for complex queries
export async function generateReasonedAnswer(
  queryAnalysis: QueryAnalysis,
  contexts: ContextChunk[],
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<EnhancedAnswer> {
  try {
    // Build context with metadata
    const contextText = contexts
      .slice(0, 5) // Top 5 most relevant chunks
      .map((chunk, i) => `[Source ${i + 1}]: ${chunk.text}`)
      .join('\n\n');

    // Enhanced system prompt based on query intent
    const systemPrompts = {
      question: "You are an expert researcher. Answer the question thoroughly using only the provided sources. Include reasoning steps.",
      summary: "You are a skilled summarizer. Provide a comprehensive summary of the key information from the sources.",
      comparison: "You are a comparison analyst. Compare and contrast the different aspects mentioned in the sources.",
      definition: "You are a technical explainer. Provide clear definitions and explanations using the source material.",
      instruction: "You are a helpful instructor. Provide step-by-step guidance based on the information in the sources.",
      complex: "You are a research analyst. Break down this complex query and provide a structured, multi-part answer."
    };

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `${systemPrompts[queryAnalysis.intent]}
        
        Guidelines:
        - Use only information from the provided sources
        - Cite sources using [Source X] format
        - If information is insufficient, state this clearly
        - Provide confidence level and reasoning
        - Suggest 3 related follow-up questions
        
        Structure your response as:
        ANSWER: [Your detailed answer]
        CONFIDENCE: [0-100]
        REASONING: [Your reasoning process]
        SOURCES: [List of sources used]
        RELATED_QUESTIONS: [3 follow-up questions]`
      }
    ];

    // Add conversation history for context
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
      messages.push(...recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }

    // Add current query and context
    messages.push({
      role: 'user',
      content: `Query: ${queryAnalysis.originalQuery}
      Expanded Query: ${queryAnalysis.expandedQuery}
      
      Sources:
      ${contextText}`
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Use GPT-4 for complex reasoning
      messages,
      temperature: 0.2,
      max_tokens: 1500,
    });

    const fullResponse = response.choices[0].message.content || '';
    
    // Parse structured response
    const answerMatch = fullResponse.match(/ANSWER:\s*(.*?)(?=CONFIDENCE:|$)/s);
    const confidenceMatch = fullResponse.match(/CONFIDENCE:\s*(\d+)/);
    const reasoningMatch = fullResponse.match(/REASONING:\s*(.*?)(?=SOURCES:|$)/s);
    const sourcesMatch = fullResponse.match(/SOURCES:\s*(.*?)(?=RELATED_QUESTIONS:|$)/s);
    const questionsMatch = fullResponse.match(/RELATED_QUESTIONS:\s*(.*?)$/s);

    return {
      answer: answerMatch?.[1]?.trim() || fullResponse,
      confidence: parseInt(confidenceMatch?.[1] || '75') / 100,
      sources: sourcesMatch?.[1]?.split('\n').filter(s => s.trim()) || [],
      relatedQuestions: questionsMatch?.[1]?.split('\n').filter(q => q.trim()) || [],
      reasoning: reasoningMatch?.[1]?.trim() || 'Standard retrieval and generation process',
      chunks: contexts
    };
  } catch (error) {
    console.error('Advanced answer generation failed:', error);
    
    // Fallback to basic answer
    const basicContext = contexts.slice(0, 3).map(c => c.text).join('\n\n');
    const fallbackResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: 'Answer the question based on the provided context. Be concise and cite sources.'
      }, {
        role: 'user',
        content: `Context: ${basicContext}\n\nQuestion: ${queryAnalysis.originalQuery}`
      }],
      temperature: 0.3,
      max_tokens: 800,
    });

    return {
      answer: fallbackResponse.choices[0].message.content || 'Unable to generate answer',
      confidence: 0.6,
      sources: ['Fallback generation'],
      relatedQuestions: [],
      reasoning: 'Fallback to basic generation due to processing error',
      chunks: contexts
    };
  }
}

// Generate follow-up questions based on context
export async function generateFollowUpQuestions(
  answer: string,
  originalQuery: string,
  contexts: ContextChunk[]
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: `Generate 5 relevant follow-up questions based on the user's original query and the provided answer. 
        Questions should:
        - Explore deeper aspects of the topic
        - Address related concepts mentioned
        - Help user understand better
        - Be specific and actionable
        
        Return as a JSON array of strings.`
      }, {
        role: 'user',
        content: `Original Query: ${originalQuery}\n\nAnswer: ${answer}`
      }],
      temperature: 0.4,
      max_tokens: 300,
    });

    const questions = JSON.parse(response.choices[0].message.content || '[]');
    return Array.isArray(questions) ? questions.slice(0, 5) : [];
  } catch (error) {
    console.error('Follow-up generation failed:', error);
    return [];
  }
}

// Detect if query requires multiple documents
export function detectMultiDocumentQuery(query: string): boolean {
  const multiDocIndicators = [
    'compare', 'contrast', 'difference', 'similar', 'versus', 'vs',
    'both', 'all documents', 'across', 'between', 'summarize everything'
  ];
  
  return multiDocIndicators.some(indicator => 
    query.toLowerCase().includes(indicator)
  );
}

// Calculate answer confidence based on multiple factors
export function calculateAnswerConfidence(
  queryAnalysis: QueryAnalysis,
  contexts: ContextChunk[],
  answerLength: number
): number {
  let confidence = 0.5; // Base confidence
  
  // Query understanding confidence
  confidence += queryAnalysis.confidence * 0.3;
  
  // Context quality
  const avgContextScore = contexts.reduce((sum, ctx) => sum + ctx.score, 0) / contexts.length;
  confidence += avgContextScore * 0.3;
  
  // Answer completeness (length as proxy)
  const lengthScore = Math.min(answerLength / 500, 1); // Normalize to 500 chars
  confidence += lengthScore * 0.2;
  
  // Number of sources
  const sourceScore = Math.min(contexts.length / 5, 1); // Ideal: 5 sources
  confidence += sourceScore * 0.2;
  
  return Math.min(confidence, 1); // Cap at 1.0
}