# TikTok Domain Harvester - Makefile
# Project structure: /web (Next.js), /worker (Python), /inngest, /supabase, /scripts

.PHONY: help install dev worker db-push db-seed lint test deploy-web deploy-worker clean
.PHONY: setup refresh-db env-check check-deps validate full-test
.PHONY: deploy-web-dry deploy-worker-dry install-web install-worker

SHELL := /bin/bash
ROOT := $(shell pwd)
UNAME_S := $(shell uname -s)

# Detect Python/pip commands
PYTHON := $(shell command -v python3 2>/dev/null || command -v python 2>/dev/null)
PIP := $(shell command -v pip3 2>/dev/null || command -v pip 2>/dev/null)

# Colors for output
RED    := \033[31m
GREEN  := \033[32m
YELLOW := \033[33m
BLUE   := \033[34m
RESET  := \033[0m

# Load environment variables from .env if present
ifneq (,$(wildcard .env))
	include .env
	export
endif

# Default target
.DEFAULT_GOAL := help

#=============================================================================
# HELP & DOCUMENTATION
#=============================================================================

help: ## Show this help message
	@echo "$(BLUE)TikTok Domain Harvester - Available Commands$(RESET)"
	@echo ""
	@echo "$(YELLOW)🚀 Quick Start:$(RESET)"
	@echo "  make setup           - First-time setup (install deps + validate env)"
	@echo "  make dev             - Start Next.js development server"
	@echo "  make worker          - Run Python worker locally"
	@echo ""
	@echo "$(YELLOW)📦 Installation:$(RESET)"
	@echo "  make install         - Install all dependencies (web + worker)"
	@echo "  make install-web     - Install only web dependencies"
	@echo "  make install-worker  - Install only worker dependencies"
	@echo ""
	@echo "$(YELLOW)🗄️  Database:$(RESET)"
	@echo "  make db-push         - Apply migrations using Supabase CLI"
	@echo "  make db-seed         - Seed database with fake data"
	@echo "  make refresh-db      - Reset and refresh database (push + seed)"
	@echo ""
	@echo "$(YELLOW)🔍 Quality & Testing:$(RESET)"
	@echo "  make lint            - Run linters (web + worker)"
	@echo "  make test            - Run test suites (web + worker)"
	@echo "  make full-test       - Complete test suite (lint + test + validate)"
	@echo "  make validate        - Validate environment and dependencies"
	@echo ""
	@echo "$(YELLOW)🚢 Deployment:$(RESET)"
	@echo "  make deploy-web           - Deploy web to Vercel (production)"
	@echo "  make deploy-web-staging   - Deploy web to Vercel (staging)"
	@echo "  make deploy-web-dry       - Dry run web deployment"
	@echo "  make deploy-worker        - Deploy worker (interactive menu)"
	@echo "  make deploy-worker-railway - Deploy worker to Railway"
	@echo "  make deploy-worker-fly    - Deploy worker to Fly.io"
	@echo "  make deploy-worker-dry    - Show worker deployment options"
	@echo "  make deploy-all           - Deploy both web and worker (production)"
	@echo "  make deploy-all-staging   - Deploy both web and worker (staging)"
	@echo "  make rollback-web         - Show rollback instructions"
	@echo "  make deployment-status    - Check deployment health and status"
	@echo "  make deployment-status-perf - Check deployment with performance tests"
	@echo ""
	@echo "$(YELLOW)🧹 Maintenance:$(RESET)"
	@echo "  make clean           - Remove caches and build artifacts"
	@echo "  make env-check       - Check environment configuration"
	@echo "  make check-deps      - Verify all dependencies are installed"
	@echo "  make status          - Show project status"
	@echo ""

#=============================================================================
# VALIDATION & CHECKS
#=============================================================================

env-check: ## Check environment configuration
	@echo "$(BLUE)==> Checking environment configuration$(RESET)"
	@if [ ! -f ".env" ]; then \
		echo "$(RED)❌ Missing .env file at repo root$(RESET)"; \
		echo "$(YELLOW)💡 Copy .env.example to .env and configure$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Environment file exists$(RESET)"
	@if [ -z "$$SUPABASE_URL" ] || [ -z "$$SUPABASE_SERVICE_ROLE_KEY" ]; then \
		echo "$(YELLOW)⚠️  Warning: Missing Supabase configuration$(RESET)"; \
	else \
		echo "$(GREEN)✅ Supabase configuration found$(RESET)"; \
	fi
	@if [ -z "$$UPSTASH_REDIS_REST_URL" ] || [ -z "$$UPSTASH_REDIS_REST_TOKEN" ]; then \
		echo "$(YELLOW)⚠️  Warning: Missing Redis configuration$(RESET)"; \
	else \
		echo "$(GREEN)✅ Redis configuration found$(RESET)"; \
	fi
	@if [ -z "$$MCP_BASE_URL" ] || [ -z "$$BRIGHTDATA_MCP_API_KEY" ]; then \
		echo "$(YELLOW)⚠️  Warning: Missing MCP configuration (MCP_BASE_URL/BRIGHTDATA_MCP_API_KEY)$(RESET)"; \
	else \
		echo "$(GREEN)✅ MCP configuration found$(RESET)"; \
	fi

check-deps: ## Verify all dependencies are installed
	@echo "$(BLUE)==> Checking system dependencies$(RESET)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js not installed$(RESET)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)❌ npm not installed$(RESET)"; exit 1; }
	@if [ -z "$(PYTHON)" ]; then echo "$(RED)❌ Python not installed$(RESET)"; exit 1; fi
	@if [ -z "$(PIP)" ]; then echo "$(RED)❌ pip not installed$(RESET)"; exit 1; fi
	@command -v supabase >/dev/null 2>&1 || echo "$(YELLOW)⚠️  Warning: Supabase CLI not installed (install with: npm install -g supabase)$(RESET)"
	@echo "$(GREEN)✅ System dependencies verified$(RESET)"
	@echo "$(BLUE)  - Python: $(PYTHON)$(RESET)"
	@echo "$(BLUE)  - pip: $(PIP)$(RESET)"

validate: env-check check-deps ## Validate complete environment setup
	@echo "$(BLUE)==> Validating project structure$(RESET)"
	@for dir in web worker supabase scripts; do \
		if [ ! -d "$$dir" ]; then \
			echo "$(RED)❌ Missing directory: $$dir$(RESET)"; \
			exit 1; \
		fi; \
	done
	@echo "$(GREEN)✅ Project structure validated$(RESET)"
	@if [ ! -f "web/package.json" ]; then \
		echo "$(RED)❌ Missing web/package.json$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "worker/requirements.txt" ]; then \
		echo "$(RED)❌ Missing worker/requirements.txt$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ All validations passed$(RESET)"

#=============================================================================
# INSTALLATION
#=============================================================================

install-web: ## Install web dependencies only
	@echo "$(BLUE)==> Installing web dependencies$(RESET)"
	@if [ ! -d "web" ]; then \
		echo "$(RED)❌ Web directory not found$(RESET)"; \
		exit 1; \
	fi
	@cd web && npm install
	@echo "$(GREEN)✅ Web dependencies installed$(RESET)"

install-worker: ## Install worker dependencies only  
	@echo "$(BLUE)==> Installing worker dependencies$(RESET)"
	@if [ ! -d "worker" ]; then \
		echo "$(RED)❌ Worker directory not found$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "worker/requirements.txt" ]; then \
		echo "$(RED)❌ worker/requirements.txt not found$(RESET)"; \
		exit 1; \
	fi
	@if [ -z "$(PIP)" ]; then \
		echo "$(RED)❌ pip not available$(RESET)"; \
		exit 1; \
	fi
	@cd worker && $(PIP) install -r requirements.txt
	@echo "$(GREEN)✅ Worker dependencies installed$(RESET)"

install: env-check install-web install-worker ## Install all dependencies
	@echo "$(GREEN)✅ All dependencies installed successfully$(RESET)"

setup: install validate ## Complete first-time setup
	@echo "$(GREEN)🎉 Setup completed successfully!$(RESET)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(RESET)"
	@echo "  1. Configure your .env file with API keys"
	@echo "  2. Run 'make db-push' to set up the database"
	@echo "  3. Run 'make dev' to start development"

#=============================================================================
# DEVELOPMENT
#=============================================================================

dev: env-check ## Run Next.js development server
	@echo "$(BLUE)==> Starting Next.js development server$(RESET)"
	@if [ ! -d "web/node_modules" ]; then \
		echo "$(YELLOW)⚠️  Node modules not found, installing...$(RESET)"; \
		$(MAKE) install-web; \
	fi
	@cd web && npm run dev

worker: env-check ## Run Python worker locally
	@echo "$(BLUE)==> Starting Python worker locally$(RESET)"
	@if [ ! -f "worker/main.py" ]; then \
		echo "$(RED)❌ worker/main.py not found$(RESET)"; \
		exit 1; \
	fi
	@if [ -z "$(PYTHON)" ]; then \
		echo "$(RED)❌ Python not available$(RESET)"; \
		exit 1; \
	fi
	@cd worker && $(PYTHON) main.py

#=============================================================================
# DATABASE
#=============================================================================

db-push: env-check ## Apply migrations using Supabase CLI
	@echo "$(BLUE)==> Applying database migrations$(RESET)"
	@if ! command -v supabase >/dev/null 2>&1; then \
		echo "$(YELLOW)⚠️  Supabase CLI not installed, trying direct psql approach$(RESET)"; \
		$(MAKE) db-push-direct; \
	else \
		$(MAKE) db-push-supabase; \
	fi

db-push-supabase: ## Apply migrations using Supabase CLI
	@echo "$(BLUE)Using Supabase CLI for migrations...$(RESET)"
	@if [ ! -d "supabase/migrations" ]; then \
		echo "$(RED)❌ Missing supabase/migrations directory$(RESET)"; \
		exit 1; \
	fi
	@if [ -z "$$SUPABASE_URL" ] || [ -z "$$SUPABASE_SERVICE_ROLE_KEY" ]; then \
		echo "$(RED)❌ Missing Supabase credentials in .env$(RESET)"; \
		echo "$(YELLOW)💡 Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY$(RESET)"; \
		exit 1; \
	fi
	@if [ -f "supabase/config.toml" ]; then \
		supabase db push --linked; \
	else \
		echo "$(YELLOW)⚠️  No supabase config found, using direct migration approach$(RESET)"; \
		$(MAKE) db-push-direct; \
	fi
	@echo "$(GREEN)✅ Database migrations applied successfully$(RESET)"

db-push-direct: ## Apply migrations using direct psql
	@echo "$(BLUE)Using direct psql for migrations...$(RESET)"
	@if [ ! -d "supabase/migrations" ]; then \
		echo "$(RED)❌ Missing supabase/migrations directory$(RESET)"; \
		exit 1; \
	fi
	@if [ -z "$$DATABASE_URL" ]; then \
		echo "$(RED)❌ DATABASE_URL not set in .env$(RESET)"; \
		echo "$(YELLOW)💡 Set DATABASE_URL for direct psql access$(RESET)"; \
		exit 1; \
	fi
	@if ! command -v psql >/dev/null 2>&1; then \
		echo "$(RED)❌ psql not available$(RESET)"; \
		echo "$(YELLOW)💡 Install PostgreSQL client or use Supabase CLI$(RESET)"; \
		exit 1; \
	fi
	@for file in supabase/migrations/*.sql; do \
		if [ -f "$$file" ]; then \
			echo "$(BLUE)Applying $$(basename $$file)...$(RESET)"; \
			psql "$$DATABASE_URL" -f "$$file" || exit 1; \
		fi; \
	done
	@echo "$(GREEN)✅ Database migrations applied successfully$(RESET)"

db-seed: env-check ## Seed database with fake data
	@echo "$(BLUE)==> Seeding database with fake data$(RESET)"
	@if [ -z "$$SUPABASE_URL" ] || [ -z "$$SUPABASE_SERVICE_ROLE_KEY" ]; then \
		echo "$(RED)❌ Missing Supabase credentials$(RESET)"; \
		echo "$(YELLOW)💡 Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "scripts/seed_db.py" ]; then \
		echo "$(RED)❌ scripts/seed_db.py not found$(RESET)"; \
		exit 1; \
	fi
	@if [ -z "$(PYTHON)" ]; then \
		echo "$(RED)❌ Python not available$(RESET)"; \
		exit 1; \
	fi
	@cd scripts && $(PYTHON) seed_db.py
	@echo "$(GREEN)✅ Database seeded successfully$(RESET)"

refresh-db: db-push db-seed ## Reset and refresh database (migrations + seed)
	@echo "$(GREEN)✅ Database refreshed successfully$(RESET)"

#=============================================================================
# QUALITY & TESTING
#=============================================================================

lint: ## Run linters for web and worker
	@echo "$(BLUE)==> Running linters$(RESET)"
	@errors=0; \
	echo "$(BLUE)Linting web...$(RESET)"; \
	cd web && (npx eslint . --max-warnings 0 || errors=$$((errors + 1))); \
	echo "$(BLUE)Linting worker...$(RESET)"; \
	if command -v flake8 >/dev/null 2>&1; then \
		cd worker && (flake8 . || errors=$$((errors + 1))); \
	else \
		echo "$(YELLOW)⚠️  flake8 not installed, skipping worker linting$(RESET)"; \
	fi; \
	if [ $$errors -eq 0 ]; then \
		echo "$(GREEN)✅ All linting passed$(RESET)"; \
	else \
		echo "$(RED)❌ Linting failed with $$errors error(s)$(RESET)"; \
		exit 1; \
	fi

test: ## Run test suites for web and worker
	@echo "$(BLUE)==> Running tests$(RESET)"
	@errors=0; \
	echo "$(BLUE)Testing web...$(RESET)"; \
	if [ -f "web/package.json" ] && grep -q '"test"' web/package.json; then \
		cd web && (npm test || errors=$$((errors + 1))); \
	else \
		echo "$(YELLOW)⚠️  No web tests configured$(RESET)"; \
	fi; \
	echo "$(BLUE)Testing worker...$(RESET)"; \
	if [ -f "worker/requirements.txt" ] && grep -q pytest worker/requirements.txt; then \
		cd worker && ($(PYTHON) -m pytest || errors=$$((errors + 1))); \
	else \
		echo "$(YELLOW)⚠️  No worker tests configured$(RESET)"; \
	fi; \
	if [ $$errors -eq 0 ]; then \
		echo "$(GREEN)✅ All tests passed$(RESET)"; \
	else \
		echo "$(RED)❌ Tests failed with $$errors error(s)$(RESET)"; \
		exit 1; \
	fi

full-test: lint test validate ## Run complete test suite
	@echo "$(GREEN)✅ Full test suite completed successfully$(RESET)"

#=============================================================================
# DEPLOYMENT
#=============================================================================

# Production deployment confirmation
confirm-prod: ## Confirm production deployment (safety check)
	@echo "$(RED)⚠️  PRODUCTION DEPLOYMENT$(RESET)"
	@echo "$(YELLOW)This will deploy to production environment.$(RESET)"
	@echo "$(YELLOW)Are you sure you want to continue? [y/N]$(RESET)" && read ans && [ $${ans:-N} = y ]

# Pre-deployment validations
pre-deploy-check: env-check ## Run pre-deployment checks
	@echo "$(BLUE)==> Running pre-deployment validations$(RESET)"
	@echo "$(BLUE)Checking git status...$(RESET)"
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "$(YELLOW)⚠️  Warning: Uncommitted changes detected$(RESET)"; \
		git status --short; \
	fi
	@echo "$(BLUE)Checking current branch...$(RESET)"
	@BRANCH=$$(git rev-parse --abbrev-ref HEAD); \
	echo "$(BLUE)Current branch: $$BRANCH$(RESET)"; \
	if [ "$$BRANCH" != "main" ] && [ "$$BRANCH" != "master" ]; then \
		echo "$(YELLOW)⚠️  Warning: Not on main/master branch$(RESET)"; \
	fi
	@echo "$(BLUE)Checking environment variables...$(RESET)"
	@$(MAKE) validate-env-vars
	@echo "$(GREEN)✅ Pre-deployment checks completed$(RESET)"

validate-env-vars: ## Validate required environment variables
	@echo "$(BLUE)==> Validating environment variables$(RESET)"
	@missing=0; \
	for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY MCP_BASE_URL BRIGHTDATA_MCP_API_KEY; do \
		if [ -z "$$$(eval echo \$$$$var)" ]; then \
			echo "$(RED)❌ Missing: $$var$(RESET)"; \
			missing=$$((missing + 1)); \
		else \
			echo "$(GREEN)✅ Found: $$var$(RESET)"; \
		fi; \
	done; \
	if [ $$missing -gt 0 ]; then \
		echo "$(RED)❌ $$missing environment variable(s) missing$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Environment variables validated$(RESET)"

# Web deployment
deploy-web-dry: ## Dry run web deployment
	@echo "$(BLUE)==> Web deployment dry run$(RESET)"
	@echo "$(YELLOW)Would deploy web/ to Vercel with:$(RESET)"
	@echo "  cd web && npx vercel deploy --prod"
	@echo ""
	@echo "$(YELLOW)Environment check:$(RESET)"
	@if command -v vercel >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Vercel CLI available$(RESET)"; \
		cd web && npx vercel --version; \
	else \
		echo "$(RED)❌ Vercel CLI not available$(RESET)"; \
		echo "$(YELLOW)💡 Install with: npm install -g vercel$(RESET)"; \
	fi
	@echo "$(YELLOW)Build check:$(RESET)"
	@cd web && npm run build --dry-run 2>/dev/null || echo "$(BLUE)Would run: npm run build$(RESET)"
	@echo "$(GREEN)✅ Dry run completed$(RESET)"

deploy-web-staging: pre-deploy-check ## Deploy web to Vercel staging
	@echo "$(BLUE)==> Deploying web to Vercel (staging)$(RESET)"
	@if ! command -v vercel >/dev/null 2>&1; then \
		echo "$(RED)❌ Vercel CLI not installed$(RESET)"; \
		echo "$(YELLOW)💡 Install with: npm install -g vercel$(RESET)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Building project...$(RESET)"
	@cd web && npm run build
	@echo "$(BLUE)Deploying to staging...$(RESET)"
	@cd web && npx vercel deploy
	@echo "$(GREEN)✅ Web deployed to staging successfully$(RESET)"

deploy-web: pre-deploy-check confirm-prod ## Deploy web to Vercel production
	@echo "$(BLUE)==> Deploying web to Vercel (production)$(RESET)"
	@if ! command -v vercel >/dev/null 2>&1; then \
		echo "$(RED)❌ Vercel CLI not installed$(RESET)"; \
		echo "$(YELLOW)💡 Install with: npm install -g vercel$(RESET)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Building project...$(RESET)"
	@cd web && npm run build
	@echo "$(BLUE)Deploying to production...$(RESET)"
	@cd web && npx vercel deploy --prod
	@echo "$(GREEN)✅ Web deployed to production successfully$(RESET)"

# Worker deployment
deploy-worker-dry: ## Show worker deployment options and validate
	@echo "$(BLUE)==> Worker deployment dry run$(RESET)"
	@echo ""
	@echo "$(YELLOW)Available deployment options:$(RESET)"
	@echo "  1. Railway: make deploy-worker-railway"
	@echo "  2. Fly.io:  make deploy-worker-fly"
	@echo "  3. Docker: make deploy-worker-docker"
	@echo ""
	@echo "$(YELLOW)Docker build test:$(RESET)"
	@if command -v docker >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Docker available$(RESET)"; \
		echo "$(BLUE)Testing Docker build...$(RESET)"; \
		docker build --dry-run -t harvester-worker-test worker/ 2>/dev/null || \
		echo "$(BLUE)Would run: docker build -t harvester-worker worker/$(RESET)"; \
	else \
		echo "$(RED)❌ Docker not available$(RESET)"; \
	fi
	@echo "$(GREEN)✅ Dry run completed$(RESET)"

deploy-worker-railway: pre-deploy-check ## Deploy worker to Railway
	@echo "$(BLUE)==> Deploying worker to Railway$(RESET)"
	@if ! command -v railway >/dev/null 2>&1; then \
		echo "$(RED)❌ Railway CLI not installed$(RESET)"; \
		echo "$(YELLOW)💡 Install with: curl -sSL railway.app/cli | sh$(RESET)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Deploying to Railway...$(RESET)"
	@cd worker && railway up
	@echo "$(GREEN)✅ Worker deployed to Railway successfully$(RESET)"

deploy-worker-fly: pre-deploy-check ## Deploy worker to Fly.io
	@echo "$(BLUE)==> Deploying worker to Fly.io$(RESET)"
	@if ! command -v fly >/dev/null 2>&1; then \
		echo "$(RED)❌ Fly CLI not installed$(RESET)"; \
		echo "$(YELLOW)💡 Install with: curl -sSL fly.io/install.sh | sh$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "worker/fly.toml" ]; then \
		echo "$(YELLOW)⚠️  fly.toml not found, initializing...$(RESET)"; \
		cd worker && fly launch --no-deploy --generate-name; \
	fi
	@echo "$(BLUE)Deploying to Fly.io...$(RESET)"
	@cd worker && fly deploy
	@echo "$(GREEN)✅ Worker deployed to Fly.io successfully$(RESET)"

deploy-worker-docker: pre-deploy-check ## Build and test worker Docker image
	@echo "$(BLUE)==> Building worker Docker image$(RESET)"
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "$(RED)❌ Docker not installed$(RESET)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Building Docker image...$(RESET)"
	@docker build -t harvester-worker:latest worker/
	@echo "$(BLUE)Testing image...$(RESET)"
	@docker run --rm harvester-worker:latest python -c "print('✅ Docker image working')"
	@echo "$(GREEN)✅ Docker image built and tested successfully$(RESET)"
	@echo "$(YELLOW)💡 To run: docker run --env-file .env harvester-worker:latest$(RESET)"

deploy-worker: ## Deploy worker (interactive menu)
	@echo "$(BLUE)==> Worker deployment$(RESET)"
	@echo "$(YELLOW)Choose deployment method:$(RESET)"
	@echo "  1. Railway (railway up)"
	@echo "  2. Fly.io (fly deploy)"
	@echo "  3. Docker build only"
	@echo ""
	@echo -n "$(YELLOW)Enter choice [1-3]: $(RESET)" && read choice; \
	case $$choice in \
		1) $(MAKE) deploy-worker-railway ;; \
		2) $(MAKE) deploy-worker-fly ;; \
		3) $(MAKE) deploy-worker-docker ;; \
		*) echo "$(RED)❌ Invalid choice$(RESET)"; exit 1 ;; \
	esac

# Rollback commands
rollback-web: ## Rollback web deployment on Vercel
	@echo "$(BLUE)==> Rolling back web deployment$(RESET)"
	@if ! command -v vercel >/dev/null 2>&1; then \
		echo "$(RED)❌ Vercel CLI not installed$(RESET)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Recent deployments:$(RESET)"
	@cd web && npx vercel ls
	@echo "$(YELLOW)💡 Use 'npx vercel rollback [deployment-url]' to rollback$(RESET)"

# Deployment status and monitoring
deployment-status: ## Check deployment status and health
	@echo "$(BLUE)==> Checking deployment status$(RESET)"
	@if [ -f "scripts/deployment-status.sh" ]; then \
		./scripts/deployment-status.sh; \
	else \
		echo "$(RED)❌ Deployment status script not found$(RESET)"; \
		exit 1; \
	fi

deployment-status-perf: ## Check deployment status with performance testing
	@echo "$(BLUE)==> Checking deployment status (with performance)$(RESET)"
	@if [ -f "scripts/deployment-status.sh" ]; then \
		./scripts/deployment-status.sh --performance; \
	else \
		echo "$(RED)❌ Deployment status script not found$(RESET)"; \
		exit 1; \
	fi

# Full deployment (web + worker)
deploy-all-staging: deploy-web-staging deploy-worker ## Deploy both web and worker to staging
	@echo "$(GREEN)✅ Full staging deployment completed$(RESET)"

deploy-all: confirm-prod deploy-web deploy-worker ## Deploy both web and worker to production
	@echo "$(GREEN)✅ Full production deployment completed$(RESET)"

#=============================================================================
# MAINTENANCE
#=============================================================================

clean: ## Remove caches and build artifacts
	@echo "$(BLUE)==> Cleaning caches and build artifacts$(RESET)"
	@echo "$(BLUE)Removing Python caches...$(RESET)"
	@find . -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name '.pytest_cache' -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name '*.pyc' -delete 2>/dev/null || true
	@echo "$(BLUE)Removing Node.js caches...$(RESET)"
	@rm -rf web/.next 2>/dev/null || true
	@rm -rf web/node_modules/.cache 2>/dev/null || true
	@rm -rf node_modules/.cache 2>/dev/null || true
	@echo "$(BLUE)Removing logs and temp files...$(RESET)"
	@find . -name '*.log' -delete 2>/dev/null || true
	@find . -name '.DS_Store' -delete 2>/dev/null || true
	@echo "$(GREEN)✅ Cleanup completed$(RESET)"

status: ## Show project status
	@echo "$(BLUE)==> Project Status$(RESET)"
	@echo ""
	@echo "$(YELLOW)🏗️  Project Structure:$(RESET)"
	@ls -la | grep "^d" | awk '{print "  " $$9}' | grep -E "(web|worker|supabase|scripts|inngest)" || echo "  No project directories found"
	@echo ""
	@echo "$(YELLOW)📦 Dependencies:$(RESET)"
	@if [ -d "web/node_modules" ]; then echo "  ✅ Web dependencies installed"; else echo "  ❌ Web dependencies missing"; fi
	@if $(PYTHON) -c "import playwright" 2>/dev/null; then echo "  ✅ Worker dependencies installed"; else echo "  ❌ Worker dependencies missing"; fi
	@echo ""
	@echo "$(YELLOW)🔧 Configuration:$(RESET)"
	@if [ -f ".env" ]; then echo "  ✅ Environment file present"; else echo "  ❌ Environment file missing"; fi
	@if [ -d "supabase/migrations" ] && [ -n "$$(ls -A supabase/migrations 2>/dev/null)" ]; then echo "  ✅ Database migrations ready"; else echo "  ❌ Database migrations missing"; fi
	@echo ""
	@echo "$(YELLOW)🛠️  System:$(RESET)"
	@echo "  Python: $(PYTHON)"
	@echo "  pip: $(PIP)"
	@node --version 2>/dev/null | sed 's/^/  Node.js: /' || echo "  Node.js: not found"
	@npm --version 2>/dev/null | sed 's/^/  npm: /' || echo "  npm: not found"

