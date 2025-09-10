#!/bin/bash

# Docker Run Script for MCP Gateway
# Usage: ./docker/run.sh [tag] [--env-file=.env] [--port=3333]

set -e

# Configuration
IMAGE_NAME="mcp-gateway"
DEFAULT_TAG="latest"
DEFAULT_PORT="3333"
CONTAINER_NAME="mcp-gateway-server"
REGISTRY=""  # Set your registry here if needed

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
TAG="${1:-$DEFAULT_TAG}"
PORT="$DEFAULT_PORT"
ENV_FILE=""
DETACHED=""

for arg in "$@"; do
    case $arg in
        --env-file=*)
            ENV_FILE="${arg#*=}"
            shift
            ;;
        --port=*)
            PORT="${arg#*=}"
            shift
            ;;
        -d|--detach)
            DETACHED="-d"
            shift
            ;;
        --help)
            echo "Usage: $0 [tag] [options]"
            echo "Options:"
            echo "  --env-file=FILE  Specify environment file (default: .env if exists)"
            echo "  --port=PORT      Host port to bind (default: 3333)"
            echo "  -d, --detach     Run container in background"
            echo "  --help           Show this help message"
            exit 0
            ;;
    esac
done

# Full image name
FULL_IMAGE_NAME="${REGISTRY}${IMAGE_NAME}:${TAG}"

echo -e "${GREEN}Starting MCP Gateway container...${NC}"
echo -e "Image: ${YELLOW}${FULL_IMAGE_NAME}${NC}"
echo -e "Port: ${YELLOW}${PORT}${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Check if image exists
if ! docker image inspect "${FULL_IMAGE_NAME}" > /dev/null 2>&1; then
    echo -e "${RED}Error: Image ${FULL_IMAGE_NAME} not found${NC}"
    echo -e "${YELLOW}Run './docker/build.sh ${TAG}' to build the image first${NC}"
    exit 1
fi

# Stop existing container if running
if docker ps -q -f name="${CONTAINER_NAME}" | grep -q .; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop "${CONTAINER_NAME}"
fi

# Remove existing container if exists
if docker ps -aq -f name="${CONTAINER_NAME}" | grep -q .; then
    echo -e "${YELLOW}Removing existing container...${NC}"
    docker rm "${CONTAINER_NAME}"
fi

# Prepare environment file flag
ENV_FLAG=""
if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
    ENV_FLAG="--env-file ${ENV_FILE}"
    echo -e "${GREEN}Using environment file: ${ENV_FILE}${NC}"
elif [ -f ".env" ]; then
    ENV_FLAG="--env-file .env"
    echo -e "${GREEN}Using default .env file${NC}"
else
    echo -e "${YELLOW}Warning: No environment file found${NC}"
fi

# Run the container
echo -e "${GREEN}Starting container...${NC}"

docker run \
    ${DETACHED} \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -p "${PORT}:3333" \
    ${ENV_FLAG} \
    --memory="512m" \
    --memory-swap="512m" \
    --cpus="1" \
    --read-only \
    --tmpfs /tmp:noexec,nosuid,size=100M \
    -v "$(pwd)/logs:/app/logs:rw" \
    --health-cmd="curl -f http://localhost:3333/health || exit 1" \
    --health-interval=30s \
    --health-timeout=3s \
    --health-retries=3 \
    --health-start-period=5s \
    "${FULL_IMAGE_NAME}"

# Check container status
if [ -z "$DETACHED" ]; then
    # Container ran in foreground and exited
    echo -e "${YELLOW}Container stopped${NC}"
else
    # Wait a moment for container to start
    sleep 2
    
    # Check if container is running
    if docker ps -q -f name="${CONTAINER_NAME}" | grep -q .; then
        echo -e "${GREEN}✓ Container started successfully!${NC}"
        echo -e "${GREEN}Container name: ${YELLOW}${CONTAINER_NAME}${NC}"
        echo -e "${GREEN}Access the service at: ${BLUE}http://localhost:${PORT}${NC}"
        echo -e "${GREEN}Health check: ${BLUE}http://localhost:${PORT}/health${NC}"
        echo ""
        echo -e "${YELLOW}Useful commands:${NC}"
        echo -e "  View logs:    docker logs -f ${CONTAINER_NAME}"
        echo -e "  Stop:         docker stop ${CONTAINER_NAME}"
        echo -e "  Restart:      docker restart ${CONTAINER_NAME}"
        echo -e "  Shell access: docker exec -it ${CONTAINER_NAME} sh"
        echo -e "  Stats:        docker stats ${CONTAINER_NAME}"
    else
        echo -e "${RED}✗ Container failed to start${NC}"
        echo -e "${YELLOW}Check logs: docker logs ${CONTAINER_NAME}${NC}"
        exit 1
    fi
fi