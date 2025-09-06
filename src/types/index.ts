export interface PDFDocument {
  id: string;
  filename: string;
  content: string;
  chunks: DocumentChunk[];
  uploadedAt: Date;
}

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    page?: number;
    section?: string;
    documentId: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  documentId?: string;
}

export interface QAResponse {
  answer: string;
  sources: EnhancedDocumentChunk[];
  confidence: number;
  relatedQuestions?: string[];
  reasoning?: string;
  queryAnalysis?: {
    intent: string;
    entities: string[];
    expandedQuery: string;
  };
}

export interface EnhancedDocumentChunk {
  content: string;
  relevanceScore: number;
  documentId: string;
  chunkIndex: number;
  metadata?: any;
}

export interface UploadResponse {
  success: boolean;
  documentId?: string;
  message: string;
  document?: {
    id: string;
    filename: string;
    uploadDate: Date;
    chunks: number;
  };
}