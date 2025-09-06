import { generateEmbedding } from './openai';
import { ContextChunk, QueryAnalysis } from './advancedQA';

export interface SearchResult {
  chunks: ContextChunk[];
  totalFound: number;
  searchStrategy: string;
}

export interface HybridSearchParams {
  query: string;
  queryAnalysis: QueryAnalysis;
  userId: string;
  documentIds?: string[];
  topK?: number;
  diversityThreshold?: number;
  includeMetadata?: boolean;
}

// Hybrid search combining dense and sparse retrieval
export async function performHybridSearch(params: HybridSearchParams): Promise<SearchResult> {
  const { query, queryAnalysis, userId, documentIds, topK = 10 } = params;
  
  try {
    // 1. Dense retrieval using embeddings
    const denseResults = await performDenseRetrieval(queryAnalysis.expandedQuery, userId, documentIds);
    
    // 2. Sparse retrieval using keyword matching
    const sparseResults = await performSparseRetrieval(queryAnalysis, userId, documentIds);
    
    // 3. Hybrid scoring and fusion
    const fusedResults = fuseSearchResults(denseResults, sparseResults, queryAnalysis);
    
    // 4. Diversity filtering to avoid redundant chunks
    const diverseResults = applyDiversityFilter(fusedResults, params.diversityThreshold || 0.7);
    
    // 5. Return top-k results
    const finalResults = diverseResults.slice(0, topK);
    
    return {
      chunks: finalResults,
      totalFound: fusedResults.length,
      searchStrategy: 'hybrid_dense_sparse'
    };
  } catch (error) {
    console.error('Hybrid search failed:', error);
    // Fallback to basic dense search
    const fallbackResults = await performDenseRetrieval(query, userId, documentIds);
    return {
      chunks: fallbackResults.slice(0, topK),
      totalFound: fallbackResults.length,
      searchStrategy: 'fallback_dense'
    };
  }
}

// Dense retrieval using vector embeddings
async function performDenseRetrieval(
  query: string, 
  userId: string, 
  documentIds?: string[]
): Promise<ContextChunk[]> {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Load vector store (in production, use Qdrant/Pinecone)
    const vectorStore = await loadVectorStore(userId);
    
    // Perform similarity search
    const results: ContextChunk[] = [];
    
    for (const [docId, chunks] of Object.entries(vectorStore)) {
      if (documentIds && !documentIds.includes(docId)) continue;
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
        
        if (similarity > 0.3) { // Minimum relevance threshold
          results.push({
            text: chunk.text,
            score: similarity,
            documentId: docId,
            chunkIndex: i,
            metadata: chunk.metadata
          });
        }
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Dense retrieval failed:', error);
    return [];
  }
}

// Sparse retrieval using keyword matching and TF-IDF
async function performSparseRetrieval(
  queryAnalysis: QueryAnalysis,
  userId: string,
  documentIds?: string[]
): Promise<ContextChunk[]> {
  try {
    const vectorStore = await loadVectorStore(userId);
    const results: ContextChunk[] = [];
    
    // Extract all keywords for matching
    const allKeywords = [
      ...queryAnalysis.keywords,
      ...queryAnalysis.entities,
      ...queryAnalysis.originalQuery.toLowerCase().split(/\s+/)
    ];
    
    for (const [docId, chunks] of Object.entries(vectorStore)) {
      if (documentIds && !documentIds.includes(docId)) continue;
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const text = chunk.text.toLowerCase();
        
        // Calculate keyword matching score
        let matchScore = 0;
        let matchCount = 0;
        
        for (const keyword of allKeywords) {
          if (keyword.length < 3) continue; // Skip very short terms
          
          const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          const matches = (text.match(regex) || []).length;
          
          if (matches > 0) {
            matchCount++;
            // Weight by keyword importance and frequency
            const importance = queryAnalysis.keywords.includes(keyword) ? 2 : 1;
            matchScore += matches * importance;
          }
        }
        
        if (matchCount > 0) {
          // Normalize score by text length and keyword count
          const normalizedScore = (matchScore * matchCount) / (text.length / 100 + allKeywords.length);
          
          results.push({
            text: chunk.text,
            score: normalizedScore,
            documentId: docId,
            chunkIndex: i,
            metadata: { ...chunk.metadata, matchCount, keywordMatches: matchScore }
          });
        }
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Sparse retrieval failed:', error);
    return [];
  }
}

// Fuse results from dense and sparse retrieval
function fuseSearchResults(
  denseResults: ContextChunk[],
  sparseResults: ContextChunk[],
  queryAnalysis: QueryAnalysis
): ContextChunk[] {
  const fusedMap = new Map<string, ContextChunk>();
  
  // Weight factors based on query type
  const denseWeight = queryAnalysis.intent === 'definition' ? 0.7 : 0.6;
  const sparseWeight = 1 - denseWeight;
  
  // Add dense results
  denseResults.forEach(chunk => {
    const key = `${chunk.documentId}_${chunk.chunkIndex}`;
    fusedMap.set(key, {
      ...chunk,
      score: chunk.score * denseWeight
    });
  });
  
  // Combine with sparse results
  sparseResults.forEach(chunk => {
    const key = `${chunk.documentId}_${chunk.chunkIndex}`;
    const existing = fusedMap.get(key);
    
    if (existing) {
      // Combine scores using RRF (Reciprocal Rank Fusion)
      const denseRank = denseResults.findIndex(d => 
        d.documentId === chunk.documentId && d.chunkIndex === chunk.chunkIndex
      ) + 1;
      const sparseRank = sparseResults.findIndex(s => 
        s.documentId === chunk.documentId && s.chunkIndex === chunk.chunkIndex
      ) + 1;
      
      const rrfScore = (1 / (60 + denseRank)) + (1 / (60 + sparseRank));
      
      fusedMap.set(key, {
        ...existing,
        score: rrfScore,
        metadata: { ...existing.metadata, fusionType: 'hybrid' }
      });
    } else {
      fusedMap.set(key, {
        ...chunk,
        score: chunk.score * sparseWeight,
        metadata: { ...chunk.metadata, fusionType: 'sparse_only' }
      });
    }
  });
  
  return Array.from(fusedMap.values()).sort((a, b) => b.score - a.score);
}

// Apply diversity filter to avoid redundant results
function applyDiversityFilter(results: ContextChunk[], threshold: number): ContextChunk[] {
  if (results.length <= 1) return results;
  
  const diverse: ContextChunk[] = [results[0]]; // Always include top result
  
  for (let i = 1; i < results.length; i++) {
    const candidate = results[i];
    let isDiverse = true;
    
    // Check similarity with already selected chunks
    for (const selected of diverse) {
      const similarity = textSimilarity(candidate.text, selected.text);
      if (similarity > threshold) {
        isDiverse = false;
        break;
      }
    }
    
    if (isDiverse) {
      diverse.push(candidate);
    }
  }
  
  return diverse;
}

// Load vector store using existing vector-store implementation
async function loadVectorStore(userId: string): Promise<Record<string, any[]>> {
  try {
    const { vectorStore } = await import('./vector-store');
    
    // Get all available documents
    const availableDocs = await vectorStore.getAllDocuments();
    const store: Record<string, any[]> = {};
    
    for (const docId of availableDocs) {
      try {
        // Load chunks for each document
        const chunks = await vectorStore.getDocumentChunks(docId);
        if (chunks && chunks.length > 0) {
          store[docId] = chunks.map(chunk => ({
            text: chunk.content,
            embedding: chunk.embedding || [],
            metadata: chunk.metadata || {}
          }));
        }
      } catch (error) {
        console.warn(`Failed to load chunks for document ${docId}:`, error);
      }
    }
    
    return store;
  } catch (error) {
    console.error('Failed to load vector store:', error);
    return {};
  }
}

// Cosine similarity calculation
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Simple text similarity using Jaccard coefficient
function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Multi-document aggregation for complex queries
export async function aggregateMultiDocumentResults(
  searchResults: SearchResult,
  queryAnalysis: QueryAnalysis
): Promise<ContextChunk[]> {
  const { chunks } = searchResults;
  
  if (queryAnalysis.intent !== 'comparison' && queryAnalysis.intent !== 'complex') {
    return chunks;
  }
  
  // Group chunks by document
  const documentGroups = chunks.reduce((groups, chunk) => {
    const docId = chunk.documentId;
    if (!groups[docId]) groups[docId] = [];
    groups[docId].push(chunk);
    return groups;
  }, {} as Record<string, ContextChunk[]>);
  
  // Ensure representation from multiple documents
  const aggregated: ContextChunk[] = [];
  const maxPerDoc = Math.ceil(chunks.length / Object.keys(documentGroups).length);
  
  Object.values(documentGroups).forEach(docChunks => {
    aggregated.push(...docChunks.slice(0, maxPerDoc));
  });
  
  return aggregated.sort((a, b) => b.score - a.score);
}