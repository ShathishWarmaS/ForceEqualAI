/**
 * Utility functions for user-specific document storage
 */

export interface Document {
  id: string;
  filename: string;
  uploadedAt: Date;
  size: number;
  type: string;
  [key: string]: any;
}

/**
 * Get the user-specific storage key for documents
 */
function getUserDocumentsKey(userId?: string): string {
  if (!userId) {
    return 'uploadedDocuments'; // Fallback for anonymous users
  }
  return `uploadedDocuments_${userId}`;
}

/**
 * Get user's documents from localStorage
 */
export function getUserDocuments(userId?: string): Document[] {
  try {
    const key = getUserDocumentsKey(userId);
    const storedDocs = localStorage.getItem(key);
    if (!storedDocs) return [];
    
    const docs = JSON.parse(storedDocs);
    // Ensure dates are properly converted
    return docs.map((doc: any) => ({
      ...doc,
      uploadedAt: new Date(doc.uploadedAt)
    }));
  } catch (error) {
    console.error('Error loading user documents:', error);
    return [];
  }
}

/**
 * Save user's documents to localStorage
 */
export function saveUserDocuments(documents: Document[], userId?: string): void {
  try {
    const key = getUserDocumentsKey(userId);
    localStorage.setItem(key, JSON.stringify(documents));
  } catch (error) {
    console.error('Error saving user documents:', error);
  }
}

/**
 * Add a document for the user
 */
export function addUserDocument(document: Document, userId?: string): void {
  const existingDocs = getUserDocuments(userId);
  const updatedDocs = [...existingDocs, document];
  saveUserDocuments(updatedDocs, userId);
}

/**
 * Remove a document for the user
 */
export function removeUserDocument(documentId: string, userId?: string): void {
  const existingDocs = getUserDocuments(userId);
  const updatedDocs = existingDocs.filter(doc => doc.id !== documentId);
  saveUserDocuments(updatedDocs, userId);
}

/**
 * Get a specific document for the user
 */
export function getUserDocument(documentId: string, userId?: string): Document | null {
  const documents = getUserDocuments(userId);
  return documents.find(doc => doc.id === documentId) || null;
}

/**
 * Check if user has a specific document
 */
export function userHasDocument(documentId: string, userId?: string): boolean {
  return getUserDocument(documentId, userId) !== null;
}

/**
 * Get document count for user
 */
export function getUserDocumentCount(userId?: string): number {
  return getUserDocuments(userId).length;
}

/**
 * Clear all documents for a user (used for logout/data clearing)
 */
export function clearUserDocuments(userId?: string): void {
  try {
    const key = getUserDocumentsKey(userId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing user documents:', error);
  }
}

/**
 * Migrate existing global documents to user-specific storage
 * This function helps transition from the old global storage to user-specific storage
 */
export function migrateGlobalDocumentsToUser(userId: string): void {
  try {
    const globalDocs = localStorage.getItem('uploadedDocuments');
    if (globalDocs && userId) {
      const docs = JSON.parse(globalDocs);
      const userKey = getUserDocumentsKey(userId);
      
      // Only migrate if user doesn't already have documents
      const existingUserDocs = localStorage.getItem(userKey);
      if (!existingUserDocs) {
        localStorage.setItem(userKey, globalDocs);
      }
      
      // Remove global documents after migration
      localStorage.removeItem('uploadedDocuments');
    }
  } catch (error) {
    console.error('Error migrating documents:', error);
  }
}