#!/bin/bash
# ═══════════════════════════════════════════
# Crypto Idea — Deploy Script
# ═══════════════════════════════════════════
# Usage: chmod +x deploy.sh && ./deploy.sh
# ═══════════════════════════════════════════

set -e

echo "🚀 Crypto Idea — Deploy v4.0.0"
echo "═══════════════════════════════"

# Check prerequisites
echo ""
echo "── Checking prerequisites ──"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Get it from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm not installed"
    exit 1
fi
echo "✅ npm $(npm -v)"

if ! command -v firebase &> /dev/null; then
    echo "⚠️  Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi
echo "✅ Firebase CLI"

# Check .env file
if [ ! -f .env ]; then
    echo ""
    echo "❌ .env file not found!"
    echo "   Copy .env.example to .env and fill in your keys:"
    echo "   cp .env.example .env"
    exit 1
fi
echo "✅ .env file found"

# Install dependencies
echo ""
echo "── Installing dependencies ──"
npm install
echo "✅ Frontend dependencies installed"

# Install Cloud Functions dependencies
if [ -d functions ]; then
    cd functions && npm install && cd ..
    echo "✅ Cloud Functions dependencies installed"
fi

# Build the app
echo ""
echo "── Building production app ──"
npm run build

# Copy PWA files to dist
cp public/manifest.json dist/manifest.json 2>/dev/null || true
cp public/sw.js dist/sw.js 2>/dev/null || true
echo "✅ Production build complete → /dist"

# Check Firebase login
echo ""
echo "── Firebase Deploy ──"
firebase login --no-localhost 2>/dev/null || true

# Deploy
echo "Deploying to Firebase..."
firebase deploy

echo ""
echo "═══════════════════════════════"
echo "🎉 Deploy complete!"
echo ""
echo "Your app is live at:"
echo "   https://crypto-idea.web.app"
echo ""
echo "Admin dashboard:"
echo "   https://crypto-idea.web.app/admin"
echo "═══════════════════════════════"
