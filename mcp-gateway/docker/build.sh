#!/bin/bash

# Docker Build Script for MCP Gateway
# Usage: ./docker/build.sh [tag] [--no-cache] [--platform=linux/amd64,linux/arm64]

set -e

# Configuration
IMAGE_NAME="mcp-gateway"
DEFAULT_TAG="latest"
REGISTRY=""  # Set your registry here if needed (e.g., "ghcr.io/username/")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
TAG="${1:-$DEFAULT_TAG}"
CACHE_FLAG=""
PLATFORM_FLAG=""

for arg in "$@"; do
    case $arg in
        --no-cache)
            CACHE_FLAG="--no-cache"
            shift
            ;;
        --platform=*)
            PLATFORM_FLAG="$arg"
            shift
            ;;
    esac
done

# Full image name
FULL_IMAGE_NAME="${REGISTRY}${IMAGE_NAME}:${TAG}"

echo -e "${GREEN}Building MCP Gateway Docker image...${NC}"
echo -e "Image: ${YELLOW}${FULL_IMAGE_NAME}${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Change to project root directory
cd "$(dirname "$0")/.."

# Build the image
echo -e "${GREEN}Starting Docker build...${NC}"

BUILD_ARGS="--build-arg NODE_VERSION=18.20.5 --build-arg ALPINE_VERSION=3.20"

# Build command with optional flags
docker build \
    ${CACHE_FLAG} \
    ${PLATFORM_FLAG} \
    ${BUILD_ARGS} \
    --target production \
    -t "${FULL_IMAGE_NAME}" \
    -f Dockerfile \
    .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully!${NC}"
    
    # Show image size
    IMAGE_SIZE=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "${FULL_IMAGE_NAME}")
    echo -e "${GREEN}Image details:${NC}"
    echo -e "${IMAGE_SIZE}"
    
    # Optional: Build development image
    read -p "Do you want to build the development image as well? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Building development image...${NC}"
        docker build \
            ${CACHE_FLAG} \
            ${PLATFORM_FLAG} \
            ${BUILD_ARGS} \
            --target development \
            -t "${IMAGE_NAME}:dev" \
            -f Dockerfile \
            .
        echo -e "${GREEN}✓ Development image built successfully!${NC}"
    fi
    
    # Security scan suggestion
    echo -e "${YELLOW}Tip: Run 'docker scout cves ${FULL_IMAGE_NAME}' to scan for vulnerabilities${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi