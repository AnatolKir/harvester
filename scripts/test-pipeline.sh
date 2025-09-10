#!/bin/bash

# TikTok Harvester Pipeline Test Script
# This script helps test the Discovery → Harvesting → Domain Extraction pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
WEB_URL="https://data.highlyeducated.com"
WORKER_URL="https://harvester-production.up.railway.app"
MCP_GATEWAY="https://mcp-gateway-production-710c.up.railway.app"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}TikTok Harvester Pipeline Test${NC}"
echo -e "${BLUE}======================================${NC}"

# Function to check service health
check_health() {
    local service_name=$1
    local health_url=$2
    
    echo -e "\n${YELLOW}Checking $service_name...${NC}"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" || echo "000")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ $service_name is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ $service_name is not responding (HTTP $response)${NC}"
        return 1
    fi
}

# Function to trigger discovery manually
trigger_discovery() {
    echo -e "\n${YELLOW}Triggering Video Discovery...${NC}"
    
    # Using the worker endpoint directly
    response=$(curl -s -X POST "$WORKER_URL/discover" \
        -H "Content-Type: application/json" \
        -d '{
            "region": "US",
            "limit": 5,
            "test_mode": true
        }' || echo '{"error": "Failed to connect"}')
    
    echo "Response: $response"
    
    if echo "$response" | grep -q "error"; then
        echo -e "${RED}✗ Discovery failed${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Discovery triggered successfully${NC}"
        return 0
    fi
}

# Function to trigger comment harvesting for a specific video
trigger_harvesting() {
    local video_id=$1
    
    echo -e "\n${YELLOW}Triggering Comment Harvesting for video: $video_id...${NC}"
    
    response=$(curl -s -X POST "$WORKER_URL/harvest" \
        -H "Content-Type: application/json" \
        -d "{
            \"video_id\": \"$video_id\",
            \"max_pages\": 2
        }" || echo '{"error": "Failed to connect"}')
    
    echo "Response: $response"
    
    if echo "$response" | grep -q "error"; then
        echo -e "${RED}✗ Harvesting failed${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Harvesting triggered successfully${NC}"
        return 0
    fi
}

# Function to check domain extraction results
check_domains() {
    echo -e "\n${YELLOW}Checking extracted domains...${NC}"
    
    response=$(curl -s "$WEB_URL/api/domains/recent" || echo '{"error": "Failed to connect"}')
    
    if echo "$response" | grep -q "error"; then
        echo -e "${RED}✗ Could not fetch domains${NC}"
        return 1
    else
        domain_count=$(echo "$response" | grep -o '"domain"' | wc -l)
        echo -e "${GREEN}✓ Found $domain_count domains${NC}"
        echo "Recent domains:"
        echo "$response" | grep -o '"domain":"[^"]*"' | head -5
        return 0
    fi
}

# Function to run integration test
run_integration_test() {
    echo -e "\n${YELLOW}Running Integration Test...${NC}"
    
    response=$(curl -s "$WEB_URL/api/test/integration")
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Integration test passed${NC}"
        echo "$response" | python3 -m json.tool | grep -E '"name"|"passed"' | head -20
        return 0
    else
        echo -e "${YELLOW}⚠ Some integration tests failed${NC}"
        echo "$response" | python3 -m json.tool | grep -E '"name"|"passed"|"message"' | head -20
        return 1
    fi
}

# Function to trigger via Inngest (if configured)
trigger_via_inngest() {
    echo -e "\n${YELLOW}Triggering via Inngest...${NC}"
    echo "Note: This requires Inngest to be configured at app.inngest.com"
    
    # Check if Inngest functions are available
    response=$(curl -s "$WEB_URL/api/inngest")
    function_count=$(echo "$response" | grep -o '"function_count"' | wc -l)
    
    if [ "$function_count" -gt 0 ]; then
        echo -e "${GREEN}✓ Inngest endpoint is configured with functions${NC}"
    else
        echo -e "${YELLOW}⚠ Inngest may not be fully configured yet${NC}"
    fi
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}======================================${NC}"
    echo -e "${BLUE}Select Test to Run:${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo "1) Check all services health"
    echo "2) Run integration test"
    echo "3) Trigger video discovery"
    echo "4) Trigger comment harvesting (requires video ID)"
    echo "5) Check extracted domains"
    echo "6) Run full pipeline test"
    echo "7) Check Inngest configuration"
    echo "8) Exit"
    echo -e "${BLUE}======================================${NC}"
}

# Main execution
main() {
    while true; do
        show_menu
        read -p "Enter choice [1-8]: " choice
        
        case $choice in
            1)
                echo -e "\n${BLUE}Checking Services Health...${NC}"
                check_health "Web App" "$WEB_URL/api/health"
                check_health "Worker" "$WORKER_URL/health"
                check_health "MCP Gateway" "$MCP_GATEWAY/health"
                ;;
            2)
                run_integration_test
                ;;
            3)
                trigger_discovery
                ;;
            4)
                read -p "Enter video ID (or press Enter for test ID): " video_id
                video_id=${video_id:-"test_video_123"}
                trigger_harvesting "$video_id"
                ;;
            5)
                check_domains
                ;;
            6)
                echo -e "\n${BLUE}Running Full Pipeline Test...${NC}"
                check_health "Web App" "$WEB_URL/api/health"
                check_health "Worker" "$WORKER_URL/health"
                trigger_discovery
                sleep 5
                echo -e "\n${YELLOW}Waiting for discovery to complete...${NC}"
                sleep 10
                check_domains
                ;;
            7)
                trigger_via_inngest
                ;;
            8)
                echo -e "${GREEN}Exiting...${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option. Please try again.${NC}"
                ;;
        esac
        
        echo -e "\n${YELLOW}Press Enter to continue...${NC}"
        read
    done
}

# Run main function
main