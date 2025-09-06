import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { vectorStore } from '@/lib/vector-store';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    console.log('🗑️ Starting document deletion...');

    // Authenticate request
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { documentId } = params;
    
    if (!documentId) {
      return NextResponse.json(
        { success: false, message: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting document: ${documentId}`);

    // Delete from vector store
    await vectorStore.deleteDocument(documentId);
    
    // Update localStorage (this is handled on the frontend, but we could also 
    // manage documents in a database in a production app)
    console.log(`✅ Document ${documentId} deleted from vector store`);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      documentId
    });

  } catch (error) {
    console.error('Document deletion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to delete document'
      },
      { status: 500 }
    );
  }
}