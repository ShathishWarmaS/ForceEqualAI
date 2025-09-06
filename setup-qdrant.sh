#!/bin/bash

echo "🚀 Setting up Qdrant for PDF Q&A App"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is installed"

# Check if Qdrant container is already running
if docker ps | grep -q "qdrant/qdrant"; then
    echo "✅ Qdrant is already running"
    docker ps | grep "qdrant/qdrant"
else
    echo "🐳 Starting Qdrant container..."
    
    # Stop any existing Qdrant container
    docker stop qdrant-pdf-qa 2>/dev/null || true
    docker rm qdrant-pdf-qa 2>/dev/null || true
    
    # Start new Qdrant container
    docker run -d \
        --name qdrant-pdf-qa \
        -p 6333:6333 \
        -v qdrant_storage:/qdrant/storage \
        qdrant/qdrant
    
    if [ $? -eq 0 ]; then
        echo "✅ Qdrant started successfully"
        echo "   📍 Access at: http://localhost:6333"
        echo "   📊 Dashboard: http://localhost:6333/dashboard"
    else
        echo "❌ Failed to start Qdrant"
        exit 1
    fi
fi

# Wait a moment for Qdrant to start up
echo "⏳ Waiting for Qdrant to be ready..."
sleep 3

# Test connection
if curl -s http://localhost:6333 > /dev/null; then
    echo "✅ Qdrant is responding"
    
    # Show collection info if it exists
    curl -s http://localhost:6333/collections/pdf-documents 2>/dev/null | grep -q "pdf-documents" \
        && echo "✅ Collection 'pdf-documents' exists" \
        || echo "ℹ️  Collection 'pdf-documents' will be created on first use"
else
    echo "❌ Qdrant is not responding. Please check the container."
    exit 1
fi

echo ""
echo "🎉 Qdrant setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env.local file:"
echo "   QDRANT_URL=http://localhost:6333"
echo "   QDRANT_COLLECTION_NAME=pdf-documents"
echo ""
echo "2. Switch to Qdrant in your API routes by changing imports:"
echo "   import { qdrantStore as vectorStore } from '@/lib/qdrant-store';"
echo ""
echo "3. Restart your Next.js app:"
echo "   npm run dev"
echo ""
echo "📊 Qdrant Dashboard: http://localhost:6333/dashboard"
echo "🔄 To stop Qdrant: docker stop qdrant-pdf-qa"