import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { generateEmbedding } from '@/lib/openai';
import { vectorStore } from '@/lib/vector-store';
import { DocumentChunk } from '@/types';

interface SearchResult {
  documentId: string;
  documentName: string;
  chunk: DocumentChunk;
  similarity: number;
  preview: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting document search...');

    // Authenticate request
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query, documentIds, maxResults = 20 } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Search query is required' },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { success: false, message: 'Search query is too long' },
        { status: 400 }
      );
    }

    console.log(`🔍 Searching for: "${query}"`);
    console.log(`📄 Document scope: ${documentIds ? `${documentIds.length} specific documents` : 'all documents'}`);

    // Generate embedding for the search query
    const startTime = Date.now();
    const queryEmbedding = await generateEmbedding(query);
    console.log(`⏱️ Query embedding generation took: ${Date.now() - startTime}ms`);

    // Search across documents
    const allResults: SearchResult[] = [];
    const searchStartTime = Date.now();

    if (documentIds && documentIds.length > 0) {
      // Search specific documents
      for (const documentId of documentIds) {
        try {
          const chunks = await vectorStore.searchSimilar(queryEmbedding, documentId, Math.ceil(maxResults / documentIds.length));
          
          for (const chunk of chunks) {
            const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
            
            if (similarity > 0.3) {
              const documentName = await getDocumentName(documentId);
              const preview = createPreview(chunk.content, query, 200);

              allResults.push({
                documentId,
                documentName,
                chunk,
                similarity,
                preview
              });
            }
          }
        } catch (error) {
          console.warn(`Error searching document ${documentId}:`, error);
        }
      }
    } else {
      // Search all documents using the new global search method
      const searchResults = await vectorStore.searchAcrossAllDocuments(queryEmbedding, maxResults);
      console.log(`📚 Global search found ${searchResults.length} results`);
      
      for (const result of searchResults) {
        const documentName = await getDocumentName(result.documentId);
        const preview = createPreview(result.chunk.content, query, 200);

        allResults.push({
          documentId: result.documentId,
          documentName,
          chunk: result.chunk,
          similarity: result.similarity,
          preview
        });
      }
    }

    console.log(`⏱️ Document search took: ${Date.now() - searchStartTime}ms`);

    // Sort all results by similarity score (descending)
    allResults.sort((a, b) => b.similarity - a.similarity);

    // Limit to maxResults
    const finalResults = allResults.slice(0, maxResults);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Search completed: ${finalResults.length} results in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      results: finalResults,
      query,
      totalResults: finalResults.length,
      searchTime: totalTime,
      documentsSearched: documentIds ? documentIds.length : await vectorStore.getAllDocuments().then(docs => docs.length)
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Search failed'
      },
      { status: 500 }
    );
  }
}

// Helper function to get document name from the uploaded documents metadata
async function getDocumentName(documentId: string): Promise<string> {
  try {
    // Try to get document metadata from the vector store first
    const metadataPath = require('path').join(process.cwd(), '.vector-store', `${documentId}-metadata.json`);
    const fs = require('fs');
    
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      return metadata.filename || `Document_${documentId.substring(0, 8)}`;
    }
  } catch (error) {
    console.log(`Could not load metadata for document ${documentId}`);
  }
  
  // Fallback to a readable format
  return `Document_${documentId.substring(0, 8)}`;
}

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Helper function to create a preview with query highlighting
function createPreview(content: string, query: string, maxLength: number): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Find the first occurrence of the query (or any word from the query)
  const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);
  let bestIndex = -1;
  let bestWord = '';
  
  for (const word of queryWords) {
    const index = lowerContent.indexOf(word);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
      bestWord = word;
    }
  }
  
  if (bestIndex === -1) {
    // No query words found, just return the beginning
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }
  
  // Try to center the preview around the found word
  const startIndex = Math.max(0, bestIndex - Math.floor(maxLength / 2));
  const endIndex = Math.min(content.length, startIndex + maxLength);
  
  let preview = content.substring(startIndex, endIndex);
  
  if (startIndex > 0) {
    preview = '...' + preview;
  }
  if (endIndex < content.length) {
    preview = preview + '...';
  }
  
  return preview;
}