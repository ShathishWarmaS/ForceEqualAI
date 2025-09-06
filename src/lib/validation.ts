import { z } from 'zod';

// Validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required')
});

export const chatSchema = z.object({
  question: z.string()
    .min(1, 'Question cannot be empty')
    .max(1000, 'Question is too long (max 1000 characters)')
    .refine((val) => val.trim().length > 0, 'Question cannot be only whitespace'),
  documentId: z.string().uuid('Invalid document ID').nullable().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
});

export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.type === 'application/pdf', 'Only PDF files are allowed')
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine((file) => file.name.length <= 255, 'Filename is too long')
});

// Security validation functions
export function sanitizeFilename(filename: string): string {
  // Remove potentially dangerous characters and limit length
  return filename
    .replace(/[^a-zA-Z0-9.-_]/g, '_')
    .substring(0, 255)
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, ''); // Remove trailing dots
}

export function sanitizeText(text: string): string {
  // Basic XSS protection - remove HTML tags and limit length
  return text
    .replace(/<[^>]*>/g, '')
    .trim()
    .substring(0, 10000);
}

export function validatePDFBuffer(buffer: Buffer): boolean {
  // Check PDF magic number
  const pdfSignature = buffer.subarray(0, 4);
  return pdfSignature.toString() === '%PDF';
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Error response helpers
export interface ValidationError {
  field: string;
  message: string;
}

export function formatValidationErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message
  }));
}