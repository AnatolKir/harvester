.PHONY: help install dev worker db-push db-seed lint test deploy-web deploy-worker env-check clean

SHELL := /bin/bash
ROOT := $(shell pwd)

# Load environment variables from .env if present
ifneq (,$(wildcard .env))
	include .env
	export
endif

help:
	@echo "Available commands:"
	@echo "  make install         - Install web & worker dependencies"
	@echo "  make dev             - Run Next.js dev server (/web)"
	@echo "  make worker          - Run Python worker locally (/worker)"
	@echo "  make db-push         - Push supabase/schema.sql to Postgres"
	@echo "  make db-seed         - Seed fake data into DB"
	@echo "  make lint            - Run linters (web + worker)"
	@echo "  make test            - Run tests (web + worker)"
	@echo "  make deploy-web      - Deploy /web to Vercel"
	@echo "  make deploy-worker   - Deploy /worker to Railway/Fly (stub)"
	@echo "  make clean           - Remove caches and build artifacts"

install: env-check
	@echo "==> Installing web deps"
	@cd web && npm install
	@echo "==> Installing worker deps"
	@cd worker && if [ -f requirements.txt ]; then pip install -r requirements.txt; else echo "no requirements.txt"; fi

dev: env-check
	@cd web && npm run dev

worker: env-check
	@cd worker && python main.py

db-push: env-check
	@if [ -z "$$DATABASE_URL" ]; then echo "Set DATABASE_URL in .env"; exit 1; fi
	@if [ ! -d "supabase/migrations" ]; then echo "Missing supabase/migrations directory"; exit 1; fi
	@echo "==> Pushing migrations to Supabase"
	@for file in supabase/migrations/*.sql; do \
		echo "Applying $$file..."; \
		psql "$$DATABASE_URL" -f "$$file" || exit 1; \
	done
	@echo "==> All migrations applied successfully"

db-seed: env-check
	@if [ -z "$$SUPABASE_URL" ] || [ -z "$$SUPABASE_SERVICE_ROLE_KEY" ]; then echo "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"; exit 1; fi
	@echo "==> Seeding fake data"
	@python scripts/seed_db.py || (echo "Consider creating scripts/seed_db.py"; exit 1)

lint:
	@echo "==> Linting web"
	@cd web && npx eslint . || true
	@echo "==> Linting worker"
	@cd worker && flake8 || true

test:
	@echo "==> Testing web"
	@cd web && npm test || true
	@echo "==> Testing worker"
	@cd worker && pytest || true

deploy-web: env-check
	@echo "==> Deploying web to Vercel"
	@cd web && npx vercel deploy --prod

deploy-worker:
	@echo "==> Deploy worker (stub). Choose one:"
	@echo "    Railway:  railway up"
	@echo "    Fly.io:   fly deploy"

env-check:
	@if [ ! -f ".env" ]; then echo "Missing .env file at repo root"; exit 1; fi
	@echo "Environment OK"

clean:
	@find . -name '__pycache__' -type d -exec rm -rf {} +
	@find . -name '.pytest_cache' -type d -exec rm -rf {} +
	@rm -rf web/.next web/node_modules/.cache || true
