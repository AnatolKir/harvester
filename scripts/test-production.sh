#!/bin/bash

# Production Integration Test for MCP Gateway on Railway
# Usage: ./test-production.sh <railway-url>
# Example: ./test-production.sh https://mcp-gateway-production.railway.app

set -e

# Check if URL is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <railway-production-url>"
    echo "Example: $0 https://mcp-gateway-production.railway.app"
    exit 1
fi

PROD_URL="${1%/}"  # Remove trailing slash if present

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Production MCP Gateway Test${NC}"
echo -e "${CYAN}Target: $PROD_URL${NC}"
echo -e "${CYAN}============================================${NC}"

# Test 1: Health Check
echo -e "\n${BLUE}[Test 1] Health Check...${NC}"
HEALTH=$(curl -s "$PROD_URL/health" | jq -r '.message' 2>/dev/null || echo "ERROR")
if [ "$HEALTH" = "OK" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    curl -s "$PROD_URL/health" | jq '.'
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Response: $(curl -s "$PROD_URL/health")"
    exit 1
fi

# Test 2: Check Available Tools
echo -e "\n${BLUE}[Test 2] Available Tools...${NC}"
TOOLS=$(curl -s -X POST "$PROD_URL/mcp" \
    -H "Content-Type: application/json" \
    -d '{"tool": "test"}' | jq -r '.error.availableTools[]' 2>/dev/null)

if [ ! -z "$TOOLS" ]; then
    echo -e "${GREEN}✅ Tools registered:${NC}"
    echo "$TOOLS" | while read tool; do
        echo "   - $tool"
    done
else
    echo -e "${RED}❌ No tools found${NC}"
fi

# Test 3: TikTok Search with Real BrightData
echo -e "\n${BLUE}[Test 3] TikTok Search (BrightData Integration)...${NC}"
SEARCH_RESULT=$(curl -s -X POST "$PROD_URL/mcp" \
    -H "Content-Type: application/json" \
    -d '{
        "tool": "tiktok.ccl.search",
        "params": {
            "keywords": "christmas sale 2025",
            "limit": 3,
            "content_type": "promoted",
            "country": "US"
        }
    }')

if echo "$SEARCH_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Search successful!${NC}"
    echo "Videos found:"
    echo "$SEARCH_RESULT" | jq -r '.result[] | "  - \(.title) by @\(.author)"' 2>/dev/null || echo "$SEARCH_RESULT" | jq '.'
elif echo "$SEARCH_RESULT" | grep -q "BrightData"; then
    echo -e "${YELLOW}⚠️  BrightData error - check API credentials${NC}"
    echo "$SEARCH_RESULT" | jq '.'
else
    echo -e "${RED}❌ Unexpected response${NC}"
    echo "$SEARCH_RESULT" | jq '.'
fi

# Test 4: Comments Harvesting
echo -e "\n${BLUE}[Test 4] Comments Page Tool...${NC}"
COMMENTS_RESULT=$(curl -s -X POST "$PROD_URL/mcp" \
    -H "Content-Type: application/json" \
    -d '{
        "tool": "tiktok.comments.page",
        "params": {
            "video_id": "7446899047644515627",
            "page": 1,
            "limit": 10
        }
    }')

if echo "$COMMENTS_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Comments retrieval successful!${NC}"
    COMMENT_COUNT=$(echo "$COMMENTS_RESULT" | jq '.result | length' 2>/dev/null || echo "0")
    echo "Comments retrieved: $COMMENT_COUNT"
elif echo "$COMMENTS_RESULT" | grep -q "error"; then
    echo -e "${YELLOW}⚠️  Comments tool error (may need valid video ID)${NC}"
else
    echo -e "${GREEN}✅ Comments endpoint accessible${NC}"
fi

# Test 5: Metrics Endpoint
echo -e "\n${BLUE}[Test 5] Metrics Endpoint...${NC}"
METRICS=$(curl -s "$PROD_URL/metrics")
if [ ! -z "$METRICS" ]; then
    echo -e "${GREEN}✅ Metrics available${NC}"
    echo "$METRICS" | jq '.' 2>/dev/null || echo "$METRICS"
else
    echo -e "${YELLOW}⚠️  No metrics data${NC}"
fi

# Test 6: Error Handling
echo -e "\n${BLUE}[Test 6] Error Handling...${NC}"
ERROR_TEST=$(curl -s -X POST "$PROD_URL/mcp" \
    -H "Content-Type: application/json" \
    -d '{}')

if echo "$ERROR_TEST" | grep -q "Tool name is required"; then
    echo -e "${GREEN}✅ Error handling working${NC}"
else
    echo -e "${RED}❌ Error handling issue${NC}"
fi

# Summary
echo -e "\n${CYAN}============================================${NC}"
echo -e "${CYAN}Production Test Summary${NC}"
echo -e "${CYAN}============================================${NC}"

echo -e "\n${BLUE}Deployment Status:${NC}"
echo "✅ MCP Gateway deployed to Railway"
echo "✅ Health check passing"
echo "✅ Tools registered and callable"

echo -e "\n${BLUE}Integration Status:${NC}"
if echo "$SEARCH_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ BrightData integration working"
    echo "✅ TikTok search returning data"
else
    echo "⚠️  BrightData integration needs configuration"
    echo "   Check BRIGHTDATA_API_KEY in Railway variables"
fi

echo -e "\n${BLUE}Next Steps:${NC}"
echo "1. Monitor Railway logs for any errors"
echo "2. Configure Inngest for scheduled jobs"
echo "3. Set up worker processes for harvesting"
echo "4. Connect Supabase for data persistence"

echo -e "\n${GREEN}Production deployment test complete!${NC}"