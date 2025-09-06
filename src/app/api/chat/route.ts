import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { generateEmbedding, generateAnswer } from '@/lib/openai';
import { vectorStore } from '@/lib/vector-store';
import { chatLimiter, getClientIdentifier } from '@/lib/rate-limiter';
import { chatSchema, sanitizeText, isValidUUID, formatValidationErrors } from '@/lib/validation';
import { QAResponse } from '@/types';
import { z } from 'zod';

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
    const { question, documentId } = validatedData;

    // Additional sanitization
    const sanitizedQuestion = sanitizeText(question);
    
    console.log('🔍 Question:', sanitizedQuestion.substring(0, 100) + '...');
    console.log('📄 Document ID:', documentId);
    
    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(sanitizedQuestion);
    console.log('🧠 Generated question embedding, length:', questionEmbedding.length);
    
    // Check available documents
    const availableDocs = await vectorStore.getAllDocuments();
    console.log('📚 Available documents:', availableDocs);
    
    // Find similar chunks from the document
    const similarChunks = await vectorStore.searchSimilar(
      questionEmbedding, 
      documentId, 
      5 // Top 5 most similar chunks
    );
    
    console.log('🔎 Found similar chunks:', similarChunks.length);
    
    if (similarChunks.length === 0) {
      console.log('❌ No chunks found for document:', documentId);
      return NextResponse.json({
        answer: 'No relevant information found in the document.',
        sources: [],
        confidence: 0
      } as QAResponse);
    }

    // Combine similar chunks as context
    const context = similarChunks
      .map(chunk => chunk.content)
      .join('\n\n');
    
    // Generate answer using OpenAI
    const answer = await generateAnswer(sanitizedQuestion, context);
    
    // Calculate confidence based on number of relevant chunks found
    const confidence = Math.min(similarChunks.length / 3, 1.0);

    const response: QAResponse = {
      answer,
      sources: similarChunks,
      confidence
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