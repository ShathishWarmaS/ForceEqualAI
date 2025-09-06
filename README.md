# PDF Q&A App

A full-stack Next.js application that allows users to upload PDF documents and ask questions about their content using OpenAI's API with Retrieval-Augmented Generation (RAG).

## 🚀 Features

- **PDF Upload & Processing**: Upload PDF documents up to 10MB
- **Text Extraction**: Automatic text extraction from PDF files
- **Vector Embeddings**: Generate embeddings using OpenAI's text-embedding-3-small model
- **Intelligent Q&A**: Ask questions about PDF content with contextual answers
- **Protected API Routes**: Secure authentication system with JWT tokens
- **Real-time Chat Interface**: Interactive chat UI for Q&A sessions
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS

## 🛠 Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI/ML**: OpenAI API (GPT-3.5-turbo, text-embedding-3-small)
- **Vector Storage**: In-memory vector store (production-ready Qdrant integration included)
- **Authentication**: JWT tokens with bcrypt password hashing
- **PDF Processing**: pdf-parse library
- **UI Components**: Lucide React icons

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## 🔧 Setup Instructions

### 1. Clone or Extract the Project

```bash
# If you have the project files, navigate to the directory
cd pdf-qa-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your API keys:

```bash
# Required: Add your OpenAI API key
OPENAI_API_KEY=sk-your-actual-openai-key-here

# Required: Generate a secure JWT secret
JWT_SECRET=your-secure-jwt-secret-here

# Optional: For production with Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-key-if-using-cloud
QDRANT_COLLECTION_NAME=pdf-documents
```

**Required Environment Variables:**
- `OPENAI_API_KEY`: Your OpenAI API key
- `JWT_SECRET`: A secure random string for JWT signing (e.g., generate with `openssl rand -base64 32`)

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🎯 Usage Guide

### Authentication
1. Open the application in your browser
2. Use the demo credentials:
   - **Email**: `demo@example.com`
   - **Password**: `password123`
3. Or register a new account

### Using the App
1. **Upload a PDF**: Drag and drop or click to browse for a PDF file
2. **Wait for Processing**: The AI will extract text and generate embeddings
3. **Ask Questions**: Type questions about the PDF content
4. **Get Answers**: Receive contextual answers based on the document

### Example Questions
- "What is the main topic of this document?"
- "Can you summarize the key points?"
- "What does the document say about [specific topic]?"

## 🏗 Project Structure

```
pdf-qa-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── chat/route.ts
│   │   │   └── upload/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── AuthForm.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── Dashboard.tsx
│   │   └── PDFUploader.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── openai.ts
│   │   ├── pdf-processor.ts
│   │   └── vector-store.ts
│   └── types/
│       └── index.ts
├── .env.local
├── package.json
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Core Features
- `POST /api/upload` - Upload and process PDF (protected)
- `POST /api/chat` - Ask questions about PDF (protected)

## 🧠 Technical Approach

### PDF Processing
1. **File Upload**: Accept PDF files via multipart form data
2. **Text Extraction**: Use pdf-parse to extract text content
3. **Text Chunking**: Split text into overlapping chunks (~1000 characters)
4. **Vector Embeddings**: Generate embeddings for each chunk using OpenAI

### Question Answering (RAG)
1. **Query Embedding**: Generate embedding for user question
2. **Similarity Search**: Find most relevant document chunks
3. **Context Building**: Combine relevant chunks as context
4. **Answer Generation**: Use GPT-3.5-turbo to generate contextual answer

### Security
- JWT token authentication for all protected routes
- Password hashing with bcrypt
- Input validation and sanitization
- File type and size restrictions

## 🚀 Production Deployment

### Environment Variables for Production
```bash
OPENAI_API_KEY=your_production_openai_key
JWT_SECRET=your_secure_jwt_secret
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_production_nextauth_secret
```

### Recommended Improvements for Production
1. **Vector Database**: Switch to Qdrant for persistent, high-performance vector storage
2. **File Storage**: Use AWS S3 or similar for PDF storage
3. **Database Integration**: Add PostgreSQL/MongoDB for user data and document metadata
4. **Rate Limiting**: Implement API rate limiting
5. **Monitoring**: Add error tracking and analytics
6. **Caching**: Implement Redis for session/response caching

### Build for Production
```bash
npm run build
npm start
```

## 🐛 Troubleshooting

### Common Issues

**1. OpenAI API Errors**
- Verify your API key is correct and has sufficient credits
- Check if your API key has access to the required models

**2. PDF Upload Fails**
- Ensure file is a valid PDF and under 10MB
- Check browser console for specific error messages

**3. Authentication Issues**
- Verify JWT_SECRET is set in environment variables
- Clear browser localStorage if experiencing token issues

**4. Build Errors**
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors in the terminal

## 📝 Development Notes

### Adding Qdrant Integration
To replace the in-memory vector store with Qdrant:

1. Start Qdrant server: `docker run -p 6333:6333 qdrant/qdrant`
2. Set up Qdrant environment variables in `.env.local`
3. Replace imports in API routes:
   ```typescript
   // Change:
   import { vectorStore } from '@/lib/vector-store';
   // To:
   import { qdrantStore as vectorStore } from '@/lib/qdrant-store';
   ```

### Extending Functionality
- Add support for multiple document types
- Implement conversation history
- Add document management features
- Integrate with other AI models

## 📄 License

This project is for evaluation purposes. Please ensure you comply with OpenAI's usage policies when using their API.

---

**Demo Credentials:**
- Email: `demo@example.com`
- Password: `password123`

For any issues or questions, please check the troubleshooting section above.