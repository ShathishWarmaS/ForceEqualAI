import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { extractTextFromPDF, processDocumentChunks } from '@/lib/pdf-processor';
import { generateEmbedding } from '@/lib/openai';
import { vectorStore } from '@/lib/vector-store';
import { uploadLimiter, getClientIdentifier } from '@/lib/rate-limiter';
import { sanitizeFilename, validatePDFBuffer } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    console.log('📄 Starting PDF upload and processing...');

    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = uploadLimiter.isAllowed(clientId);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Too many upload requests. Please try again later.',
          rateLimitInfo: {
            resetTime: rateLimitResult.resetTime
          }
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }

    // Authenticate request
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data with size validation
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Enhanced file validation
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, message: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { success: false, message: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    if (file.name.length > 255) {
      return NextResponse.json(
        { success: false, message: 'Filename is too long' },
        { status: 400 }
      );
    }

    // Convert file to buffer and validate PDF signature
    const buffer = Buffer.from(await file.arrayBuffer());
    
    if (!validatePDFBuffer(buffer)) {
      return NextResponse.json(
        { success: false, message: 'Invalid PDF file format' },
        { status: 400 }
      );
    }

    console.log(`🔒 File validation passed: ${sanitizeFilename(file.name)} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Extract text from PDF
    console.log('🔍 Extracting text from PDF...');
    const extractTime = Date.now();
    const text = await extractTextFromPDF(buffer);
    console.log(`⏱️  Text extraction took: ${Date.now() - extractTime}ms`);
    
    if (!text.trim()) {
      return NextResponse.json(
        { success: false, message: 'No text content found in PDF' },
        { status: 400 }
      );
    }

    console.log(`📊 Extracted ${text.length} characters of text`);

    // Generate document ID
    const documentId = uuidv4();
    
    // Process document into chunks with embeddings
    console.log('🧩 Processing document into chunks and generating embeddings...');
    const chunkTime = Date.now();
    const chunks = await processDocumentChunks(text, documentId, generateEmbedding);
    console.log(`⏱️  Chunk processing and embedding generation took: ${Date.now() - chunkTime}ms`);
    
    if (chunks.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Failed to process document chunks' },
        { status: 500 }
      );
    }

    console.log(`✅ Generated ${chunks.length} chunks with embeddings`);

    // Store in vector database with metadata
    console.log('💾 Storing in vector database...');
    const storeTime = Date.now();
    const metadata = {
      filename: file.name,
      uploadDate: new Date(),
      chunks: chunks.length,
      fileSize: file.size,
      processingTime: Date.now() - startTime
    };
    await vectorStore.storeDocument(documentId, chunks, metadata);
    console.log(`⏱️  Vector storage took: ${Date.now() - storeTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Total processing time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);

    const response: UploadResponse = {
      success: true,
      documentId,
      message: `Successfully processed PDF with ${chunks.length} chunks in ${(totalTime/1000).toFixed(2)}s`,
      // Include document metadata for frontend
      document: {
        id: documentId,
        filename: file.name,
        uploadDate: new Date(),
        chunks: chunks.length
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}