#!/bin/bash

# Quick test script to check vector database contents
# Replace YOUR_TOKEN with actual admin token

echo "=== Testing Vector Database ==="
echo ""

echo "1. Getting collection stats..."
curl -s http://localhost:3001/api/ai/stats \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.'

echo ""
echo "2. Getting sample points to see metadata structure..."
curl -s http://localhost:3001/api/vector-data/debug/sample-points?limit=3 \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.'

echo ""
echo "3. Searching WITHOUT filters..."
curl -s -X POST http://localhost:3001/api/vector-data/debug/search-unfiltered \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Desktop", "k": 5}' | jq '.'
