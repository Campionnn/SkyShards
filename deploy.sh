#!/bin/bash

# SkyShards Quick Deploy Script
# This script will deploy your app to Vercel (recommended)

echo "🚀 SkyShards Deployment Script"
echo "=============================="

# Check if build exists
if [ ! -d "dist" ]; then
    echo "📦 Building project..."
    pnpm run build
fi

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "📥 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "Your app should be live at the URL shown above."
echo ""
echo "💡 Other deployment options:"
echo "   - Netlify: pnpm run deploy:netlify"
echo "   - Surge: pnpm run deploy:surge"
echo "   - Railway: railway up"
