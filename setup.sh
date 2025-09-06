#!/bin/bash

echo "🚀 PDF Q&A App Setup"
echo "===================="

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backup created as .env.local.backup"
    cp .env.local .env.local.backup
fi

# Copy example file
if [ -f ".env.example" ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
else
    echo "❌ .env.example not found!"
    exit 1
fi

# Generate JWT secret
echo "🔑 Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
if [ $? -eq 0 ]; then
    # Replace JWT_SECRET in .env.local
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/JWT_SECRET=/JWT_SECRET=$JWT_SECRET/" .env.local
    else
        # Linux
        sed -i "s/JWT_SECRET=/JWT_SECRET=$JWT_SECRET/" .env.local
    fi
    echo "✅ JWT secret generated and added to .env.local"
else
    echo "⚠️  Could not generate JWT secret. Please add one manually."
fi

echo ""
echo "📝 Next steps:"
echo "1. Edit .env.local and add your OpenAI API key:"
echo "   OPENAI_API_KEY=sk-your-actual-key-here"
echo ""
echo "2. Get your OpenAI API key from:"
echo "   https://platform.openai.com/api-keys"
echo ""
echo "3. Start the development server:"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:3000 and login with:"
echo "   📧 demo@example.com"
echo "   🔑 password123"
echo ""
echo "🎉 Setup complete! Just add your OpenAI API key and you're ready to go!"