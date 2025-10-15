#!/bin/bash

# Industrial Org Chart Builder - Setup Script
# This script automates the installation process

set -e  # Exit on error

echo "=================================="
echo "Industrial Org Chart Builder"
echo "Setup Script"
echo "=================================="
echo ""

# Check Node.js installation
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js $NODE_VERSION is installed"

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm $NPM_VERSION is installed"
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
npm install
echo "✅ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd client
npm install
cd ..
echo "✅ Frontend dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Backend Configuration
PORT=5000
NODE_ENV=development
EOF
    echo "✅ .env file created"
fi

echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "To start the application:"
echo "  npm start          # Start both backend and frontend"
echo ""
echo "Or start them separately:"
echo "  npm run server     # Start backend (port 5000)"
echo "  npm run client     # Start frontend (port 3000)"
echo ""
echo "Documentation:"
echo "  QUICKSTART.md           - Quick start guide"
echo "  README.md               - Full documentation"
echo "  INSTALLATION.md         - Detailed installation guide"
echo "  DATA-COLLECTION-GUIDE.md - Ethical data collection methods"
echo ""
echo "Sample data:"
echo "  sample-import-template.csv - Example contact data"
echo ""
echo "=================================="
echo "Ready to build org charts! 🎉"
echo "=================================="
