import { DocumentChunk } from '@/types';
import * as fs from 'fs';
import * as path from 'path';

// Simple persistent vector store for development
// In production, you would use Pinecone or another vector database
class PersistentVectorStore {
  private documents: Map<string, DocumentChunk[]> = new Map();
  private dataDir: string;
  
  constructor() {
    this.dataDir = path.join(process.cwd(), '.vector-store');
    this.ensureDataDir();
    this.loadFromDisk();
  }
  
  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }
  
  private getFilePath(documentId: string): string {
    return path.join(this.dataDir, `${documentId}.json`);
  }
  
  private getMetadataPath(documentId: string): string {
    return path.join(this.dataDir, `${documentId}-metadata.json`);
  }
  
  private loadFromDisk() {
    try {
      const files = fs.readdirSync(this.dataDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const documentId = file.replace('.json', '');
          const filePath = this.getFilePath(documentId);
          const data = fs.readFileSync(filePath, 'utf8');
          const chunks = JSON.parse(data);
          this.documents.set(documentId, chunks);
        }
      }
      console.log(`📚 Loaded ${this.documents.size} documents from disk`);
    } catch (error) {
      console.log('📚 No existing vector store data found');
    }
  }
  
  private saveToDisk(documentId: string, chunks: DocumentChunk[]) {
    try {
      const filePath = this.getFilePath(documentId);
      fs.writeFileSync(filePath, JSON.stringify(chunks, null, 2));
    } catch (error) {
      console.error('Error saving to disk:', error);
    }
  }
  
  async storeDocument(documentId: string, chunks: DocumentChunk[], metadata?: any): Promise<void> {
    this.documents.set(documentId, chunks);
    this.saveToDisk(documentId, chunks);
    
    // Save metadata if provided
    if (metadata) {
      this.saveMetadataToDisk(documentId, metadata);
    }
    
    console.log(`💾 Saved document ${documentId} with ${chunks.length} chunks to disk`);
  }
  
  private saveMetadataToDisk(documentId: string, metadata: any) {
    try {
      const metadataPath = this.getMetadataPath(documentId);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Error saving metadata to disk:', error);
    }
  }
  
  async searchSimilar(
    queryEmbedding: number[], 
    documentId: string, 
    topK: number = 5
  ): Promise<DocumentChunk[]> {
    const chunks = this.documents.get(documentId);
    if (!chunks) {
      return [];
    }
    
    // Calculate cosine similarity for each chunk
    const similarities = chunks.map(chunk => ({
      chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by similarity (descending) and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(item => item.chunk);
  }
  
  async deleteDocument(documentId: string): Promise<void> {
    this.documents.delete(documentId);
    try {
      // Delete vector data file
      const filePath = this.getFilePath(documentId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete metadata file
      const metadataPath = this.getMetadataPath(documentId);
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
    } catch (error) {
      console.error('Error deleting from disk:', error);
    }
  }
  
  async getAllDocuments(): Promise<string[]> {
    return Array.from(this.documents.keys());
  }

  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    return this.documents.get(documentId) || [];
  }
  
  async searchAcrossAllDocuments(
    queryEmbedding: number[], 
    topK: number = 10
  ): Promise<Array<{documentId: string, chunk: DocumentChunk, similarity: number}>> {
    const allResults: Array<{documentId: string, chunk: DocumentChunk, similarity: number}> = [];
    
    // Search through all documents
    for (const [documentId, chunks] of this.documents.entries()) {
      const similarities = chunks.map(chunk => ({
        documentId,
        chunk,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
      }));
      
      // Only include results above threshold
      const relevantResults = similarities.filter(item => item.similarity > 0.3);
      allResults.push(...relevantResults);
    }
    
    // Sort by similarity and return top K
    return allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
  
  getDocumentChunks(documentId: string): DocumentChunk[] | undefined {
    return this.documents.get(documentId);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
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
}

export const vectorStore = new PersistentVectorStore();