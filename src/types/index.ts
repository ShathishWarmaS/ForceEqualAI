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
  sources: DocumentChunk[];
  confidence: number;
}

export interface UploadResponse {
  success: boolean;
  documentId?: string;
  message: string;
}