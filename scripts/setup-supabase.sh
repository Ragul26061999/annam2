#!/bin/bash

# Supabase Setup Script
# This script helps set up Supabase CLI for the project

echo "🚀 Setting up Supabase CLI..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed."
    echo "Please install it by running: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI is installed"

# Check if Docker is running
if ! docker info &> /dev/null
then
    echo "❌ Docker is not running."
    echo "Please start Docker and run this script again."
    exit 1
fi

echo "✅ Docker is running"

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Could not find supabase/config.toml"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "✅ Found Supabase configuration"

# Start Supabase services
echo "🔄 Starting Supabase services..."
supabase start

if [ $? -ne 0 ]; then
    echo "❌ Failed to start Supabase services"
    exit 1
fi

echo "✅ Supabase services started successfully"

# Apply migrations and seed data
echo "🔄 Applying migrations and seed data..."
supabase db reset

if [ $? -ne 0 ]; then
    echo "❌ Failed to apply migrations"
    exit 1
fi

echo "✅ Migrations and seed data applied successfully"

# Show status
echo "📋 Supabase Status:"
supabase status

echo "🎉 Supabase setup completed successfully!"
echo "You can now access Supabase Studio at http://localhost:54323"