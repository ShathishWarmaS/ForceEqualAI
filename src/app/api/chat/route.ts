import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { generateEmbedding, generateAnswer } from '@/lib/openai';
import { vectorStore } from '@/lib/vector-store';
import { chatLimiter, getClientIdentifier } from '@/lib/rate-limiter';
import { chatSchema, sanitizeText, isValidUUID, formatValidationErrors } from '@/lib/validation';
import { QAResponse } from '@/types';
import { z } from 'zod';

// Advanced Q&A imports
import { 
  expandQuery, 
  rerankContexts, 
  generateReasonedAnswer, 
  generateFollowUpQuestions,
  detectMultiDocumentQuery,
  calculateAnswerConfidence,
  QueryAnalysis,
  ContextChunk,
  EnhancedAnswer
} from '@/lib/advancedQA';
import { 
  performHybridSearch, 
  aggregateMultiDocumentResults 
} from '@/lib/enhancedSearch';
import { 
  AdaptiveRetrievalEngine,
  AdaptiveRetrievalStrategy,
  EnhancedContext
} from '@/lib/adaptiveRAG';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = chatLimiter.isAllowed(clientId);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please slow down.',
          rateLimitInfo: {
            resetTime: rateLimitResult.resetTime
          }
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

    // Authenticate request
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate input with Zod schema
    const validatedData = chatSchema.parse(requestBody);
    const { question, documentId, conversationHistory } = validatedData;

    // Additional sanitization
    const sanitizedQuestion = sanitizeText(question);
    
    console.log('🔍 Advanced Q&A Processing:', sanitizedQuestion.substring(0, 100) + '...');
    console.log('📄 Document ID:', documentId);

    // 🚀 ADAPTIVE RAG 2025 PIPELINE 🚀
    console.log('🎯 Initializing Adaptive RAG Engine...');
    
    // Step 1: Initialize Adaptive RAG Engine
    const adaptiveEngine = new AdaptiveRetrievalEngine(user.userId);
    
    // Step 2: Query Analysis and Expansion
    const queryAnalysis: QueryAnalysis = await expandQuery(sanitizedQuestion);
    console.log('🧠 Query Analysis:', {
      intent: queryAnalysis.intent,
      entities: queryAnalysis.entities.slice(0, 3),
      confidence: queryAnalysis.confidence
    });

    // Step 3: Adaptive Strategy Selection (AI-driven strategy selection)
    const retrievalStrategy: AdaptiveRetrievalStrategy = await adaptiveEngine.selectRetrievalStrategy(queryAnalysis);
    console.log('🔄 Selected Strategy:', {
      strategy: retrievalStrategy.strategy,
      confidence: retrievalStrategy.confidence,
      reasoning: retrievalStrategy.reasoning.substring(0, 100) + '...'
    });

    let enhancedContexts: EnhancedContext[] = [];
    let enhancedAnswer: EnhancedAnswer;
    
    if (documentId || detectMultiDocumentQuery(sanitizedQuestion)) {
      // Advanced document-based Q&A with adaptive strategies
      
      console.log('📚 Document-based adaptive retrieval activated');
      
      // Step 4: Strategy-specific retrieval execution
      switch (retrievalStrategy.strategy) {
        case 'multi_stage':
          enhancedContexts = await adaptiveEngine.performMultiStageRetrieval(
            queryAnalysis, 
            retrievalStrategy, 
            user.userId
          );
          break;
          
        case 'knowledge_graph':
          enhancedContexts = await adaptiveEngine.performKnowledgeGraphRetrieval(
            queryAnalysis,
            retrievalStrategy,
            user.userId
          );
          break;
          
        case 'multimodal':
          enhancedContexts = await adaptiveEngine.performMultimodalRetrieval(
            queryAnalysis,
            user.userId
          );
          break;
          
        case 'expert_domain':
          // Domain-specialized retrieval with enhanced metadata
          enhancedContexts = await adaptiveEngine.performMultiStageRetrieval(
            queryAnalysis,
            { ...retrievalStrategy, parameters: { ...retrievalStrategy.parameters, stages: 4 } },
            user.userId
          );
          break;
          
        default: // 'simple'
          // Fallback to hybrid search with enhancements
          const searchResult = await performHybridSearch({
            query: sanitizedQuestion,
            queryAnalysis,
            userId: user.userId,
            documentIds: documentId ? [documentId] : undefined,
            topK: 8,
            diversityThreshold: 0.7
          });
          
          // Convert to enhanced contexts
          enhancedContexts = searchResult.chunks.map(chunk => ({
            ...chunk,
            metadata: {
              documentType: 'text' as const,
              trustworthiness: 0.8,
              recency: 30,
              authority: 0.7,
              complexity: 0.5,
              relationships: [],
              semanticTags: [],
              extractedEntities: []
            }
          }));
          break;
      }
      
      console.log('🔍 Enhanced Contexts Retrieved:', {
        count: enhancedContexts.length,
        avgTrustworth: enhancedContexts.reduce((sum, ctx) => sum + ctx.metadata.trustworthiness, 0) / enhancedContexts.length,
        strategy: retrievalStrategy.strategy
      });
      
      if (enhancedContexts.length === 0) {
        console.log('❌ No relevant content found with adaptive retrieval');
        return NextResponse.json({
          answer: 'No relevant information found in the document(s) despite using advanced retrieval techniques.',
          sources: [],
          confidence: 0,
          relatedQuestions: [],
          reasoning: 'Advanced adaptive retrieval found no matching content',
          retrievalStrategy: retrievalStrategy.strategy
        });
      }

      // Step 5: Query and Prompt Enhancement with Compression
      const enhancedPrompt = await adaptiveEngine.enhanceAndCompressPrompt(
        enhancedContexts,
        queryAnalysis,
        conversationHistory
      );

      // Step 6: Advanced Answer Generation with Enhanced Context
      const contextChunks: ContextChunk[] = enhancedContexts.map(ctx => ({
        text: ctx.text,
        score: ctx.score,
        documentId: ctx.documentId,
        chunkIndex: ctx.chunkIndex,
        metadata: ctx.metadata
      }));

      enhancedAnswer = await generateReasonedAnswer(
        queryAnalysis,
        contextChunks,
        conversationHistory
      );

      // Step 7: Advanced Confidence Calculation with Metadata
      const metadataConfidence = enhancedContexts.reduce((sum, ctx) => 
        sum + (ctx.metadata.trustworthiness * ctx.metadata.authority * ctx.score), 0
      ) / enhancedContexts.length;
      
      const finalConfidence = Math.max(
        enhancedAnswer.confidence,
        calculateAnswerConfidence(queryAnalysis, contextChunks, enhancedAnswer.answer.length),
        metadataConfidence
      );

      enhancedAnswer.confidence = Math.min(finalConfidence, 1.0);
      enhancedAnswer.chunks = contextChunks;

      // Add retrieval strategy info to reasoning
      enhancedAnswer.reasoning += ` [Strategy: ${retrievalStrategy.strategy}, Confidence: ${(retrievalStrategy.confidence * 100).toFixed(0)}%]`;

      console.log('✨ Adaptive RAG Answer:', {
        confidence: enhancedAnswer.confidence,
        sources: enhancedAnswer.sources.length,
        strategy: retrievalStrategy.strategy,
        metadataEnhanced: true
      });
      
    } else {
      // General AI assistant mode with follow-up generation
      console.log('🤖 General AI assistant mode (no document selected)');
      
      const basicAnswer = await generateAnswer(
        sanitizedQuestion, 
        'You are a helpful AI assistant. Answer based on your general knowledge.',
        conversationHistory
      );
      
      // Generate follow-up questions for general queries
      const followUps = await generateFollowUpQuestions(
        basicAnswer,
        sanitizedQuestion,
        []
      );
      
      enhancedAnswer = {
        answer: basicAnswer,
        confidence: 0.7,
        sources: ['General AI Knowledge'],
        relatedQuestions: followUps,
        reasoning: 'Generated using general AI knowledge without document context (Adaptive RAG disabled)',
        chunks: []
      };
    }

    const response = {
      answer: enhancedAnswer.answer,
      sources: enhancedAnswer.chunks.map(chunk => ({
        content: chunk.text,
        relevanceScore: chunk.score,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        // Enhanced metadata from Adaptive RAG
        metadata: chunk.metadata || {},
        trustworthiness: chunk.metadata?.trustworthiness || 0.8,
        authority: chunk.metadata?.authority || 0.7
      })),
      confidence: enhancedAnswer.confidence,
      relatedQuestions: enhancedAnswer.relatedQuestions,
      reasoning: enhancedAnswer.reasoning,
      queryAnalysis: {
        intent: queryAnalysis.intent,
        entities: queryAnalysis.entities,
        expandedQuery: queryAnalysis.expandedQuery
      },
      // Adaptive RAG 2025 enhancements
      adaptiveRAG: {
        strategy: retrievalStrategy.strategy,
        strategyConfidence: retrievalStrategy.confidence,
        strategyReasoning: retrievalStrategy.reasoning,
        enhancedMetadata: true,
        version: '2025.1'
      }
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          validationErrors: formatValidationErrors(error)
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}