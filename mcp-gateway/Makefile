.PHONY: help build run stop clean logs shell test lint security-scan push

# Default target
help:
	@echo "MCP Gateway Docker Commands"
	@echo "=========================="
	@echo "make build          - Build production Docker image"
	@echo "make build-dev      - Build development Docker image"
	@echo "make run            - Run production container"
	@echo "make run-dev        - Run development container with hot reload"
	@echo "make stop           - Stop running container"
	@echo "make clean          - Remove container and image"
	@echo "make logs           - View container logs"
	@echo "make shell          - Access container shell"
	@echo "make test           - Run tests in container"
	@echo "make lint           - Run linting in container"
	@echo "make security-scan  - Scan image for vulnerabilities"
	@echo "make push           - Push image to registry"
	@echo "make compose-up     - Start with docker-compose"
	@echo "make compose-down   - Stop docker-compose services"

# Variables
IMAGE_NAME := mcp-gateway
CONTAINER_NAME := mcp-gateway-server
TAG := latest
PORT := 3333
REGISTRY := 

# Build production image
build:
	@echo "Building production Docker image..."
	docker build \
		--build-arg NODE_VERSION=18.20.5 \
		--build-arg ALPINE_VERSION=3.20 \
		--target production \
		-t $(IMAGE_NAME):$(TAG) \
		-f Dockerfile .
	@echo "Image size:"
	@docker images $(IMAGE_NAME):$(TAG) --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"

# Build development image
build-dev:
	@echo "Building development Docker image..."
	docker build \
		--build-arg NODE_VERSION=18.20.5 \
		--build-arg ALPINE_VERSION=3.20 \
		--target development \
		-t $(IMAGE_NAME):dev \
		-f Dockerfile .

# Build for multiple platforms
build-multi:
	@echo "Building for multiple platforms..."
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		--build-arg NODE_VERSION=18.20.5 \
		--build-arg ALPINE_VERSION=3.20 \
		--target production \
		-t $(IMAGE_NAME):$(TAG) \
		-f Dockerfile .

# Run production container
run: build
	@echo "Starting production container..."
	docker run -d \
		--name $(CONTAINER_NAME) \
		--restart unless-stopped \
		-p $(PORT):3333 \
		--env-file .env \
		--memory="512m" \
		--cpus="1" \
		--read-only \
		--tmpfs /tmp:noexec,nosuid,size=100M \
		-v $$(pwd)/logs:/app/logs:rw \
		$(IMAGE_NAME):$(TAG)
	@echo "Container started at http://localhost:$(PORT)"

# Run development container
run-dev: build-dev
	@echo "Starting development container..."
	docker run -it --rm \
		--name $(CONTAINER_NAME)-dev \
		-p $(PORT):3333 \
		--env-file .env \
		-v $$(pwd)/src:/app/src:ro \
		-v $$(pwd)/logs:/app/logs:rw \
		$(IMAGE_NAME):dev

# Stop container
stop:
	@echo "Stopping container..."
	@docker stop $(CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(CONTAINER_NAME) 2>/dev/null || true

# Clean up
clean: stop
	@echo "Cleaning up Docker resources..."
	@docker rmi $(IMAGE_NAME):$(TAG) 2>/dev/null || true
	@docker rmi $(IMAGE_NAME):dev 2>/dev/null || true
	@docker system prune -f

# View logs
logs:
	docker logs -f $(CONTAINER_NAME)

# Access container shell
shell:
	docker exec -it $(CONTAINER_NAME) sh

# Run tests in container
test:
	docker run --rm \
		-v $$(pwd):/app:ro \
		$(IMAGE_NAME):dev \
		npm test

# Run linting in container
lint:
	docker run --rm \
		-v $$(pwd):/app:ro \
		$(IMAGE_NAME):dev \
		npm run lint

# Security scan
security-scan:
	@echo "Scanning image for vulnerabilities..."
	@docker scout cves $(IMAGE_NAME):$(TAG) 2>/dev/null || \
		(echo "Docker Scout not available. Try: trivy image $(IMAGE_NAME):$(TAG)" && \
		 trivy image $(IMAGE_NAME):$(TAG) 2>/dev/null || \
		 echo "Install trivy: brew install aquasecurity/trivy/trivy")

# Push to registry
push:
	@echo "Pushing image to registry..."
	docker tag $(IMAGE_NAME):$(TAG) $(REGISTRY)$(IMAGE_NAME):$(TAG)
	docker push $(REGISTRY)$(IMAGE_NAME):$(TAG)

# Docker Compose commands
compose-up:
	docker-compose up -d

compose-down:
	docker-compose down

compose-logs:
	docker-compose logs -f

compose-dev:
	docker-compose --profile dev up

# Health check
health:
	@curl -f http://localhost:$(PORT)/health || echo "Health check failed"

# Image info
info:
	@echo "Image Information:"
	@docker inspect $(IMAGE_NAME):$(TAG) --format '{{json .Config}}' | jq '.'