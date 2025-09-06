import pdfParse from 'pdf-parse';
import { DocumentChunk } from '@/types';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk.trim());
    
    if (end === text.length) break;
    start = end - overlap;
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

export async function processDocumentChunks(
  text: string, 
  documentId: string,
  generateEmbedding: (text: string) => Promise<number[]>
): Promise<DocumentChunk[]> {
  const textChunks = chunkText(text);
  const documentChunks: DocumentChunk[] = [];
  
  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    try {
      const embedding = await generateEmbedding(chunk);
      
      documentChunks.push({
        id: `${documentId}-chunk-${i}`,
        content: chunk,
        embedding,
        metadata: {
          documentId,
          section: `chunk-${i}`,
        }
      });
    } catch (error) {
      console.error(`Error processing chunk ${i}:`, error);
      continue;
    }
  }
  
  return documentChunks;
}