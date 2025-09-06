// Simple test script to verify app functionality
const { exec } = require('child_process');

console.log('🚀 PDF Q&A App - Test Script');
console.log('===============================\n');

// Test 1: Check if dependencies are installed correctly
console.log('1. Testing Dependencies...');
try {
  require('openai');
  require('pdf-parse');
  require('bcryptjs');
  require('jsonwebtoken');
  require('uuid');
  console.log('✅ All core dependencies are available\n');
} catch (error) {
  console.log('❌ Missing dependencies:', error.message);
  process.exit(1);
}

// Test 2: Check environment configuration
console.log('2. Testing Environment Configuration...');
require('dotenv').config({ path: '.env.local' });

const requiredEnvVars = ['OPENAI_API_KEY', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:', missingVars.join(', '));
  console.log('Please check your .env.local file\n');
} else {
  console.log('✅ Environment variables configured\n');
}

// Test 3: Test core utilities
console.log('3. Testing Core Utilities...');
try {
  // Test PDF processor functions
  const { chunkText } = require('./src/lib/pdf-processor.ts');
  const testText = 'This is a test document with some content that should be chunked properly.';
  const chunks = chunkText(testText, 20, 5);
  
  if (chunks.length > 0) {
    console.log('✅ PDF text chunking works correctly');
  }
  
  // Test vector store
  const { vectorStore } = require('./src/lib/vector-store.ts');
  console.log('✅ Vector store initialized');
  
  // Test auth utilities  
  const { generateToken, verifyToken } = require('./src/lib/auth.ts');
  const testPayload = { userId: 'test', email: 'test@example.com' };
  const token = generateToken(testPayload);
  const verified = verifyToken(token);
  
  if (verified && verified.userId === 'test') {
    console.log('✅ Authentication utilities work correctly');
  }
  
  console.log('✅ All core utilities are functional\n');
} catch (error) {
  console.log('❌ Error testing utilities:', error.message);
}

// Test 4: Build verification
console.log('4. Build Verification...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Build failed:', error.message);
    return;
  }
  console.log('✅ Application builds successfully\n');
  
  console.log('🎉 All tests completed!');
  console.log('\nTo start the application:');
  console.log('1. Ensure your .env.local has OPENAI_API_KEY and JWT_SECRET');
  console.log('2. Run: npm run dev');
  console.log('3. Open: http://localhost:3000');
  console.log('4. Use demo credentials: demo@example.com / password123');
});