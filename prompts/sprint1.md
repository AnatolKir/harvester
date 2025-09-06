# Sprint 1: Project Foundations

## Overview

Set up core infrastructure: repo structure, Supabase database, authentication, and basic API routes with seed data.

---

## Prompt 1: Repository Structure

Create the monorepo structure with `/web` (Next.js), `/worker` (Python), `/supabase`, `/inngest`, and `/scripts` directories. Include a root Makefile with essential commands.

## Prompt 2: Supabase Database Schema

Design and create the PostgreSQL schema with tables: `video`, `comment`, `domain`, `domain_mention`. Include proper indexes and relationships.

## Prompt 3: Database Views & RLS

Create SQL views (`v_domains_new_today`, `v_top_domains`) and implement Row-Level Security policies for all tables.

## Prompt 4: Supabase Auth Setup

Configure Supabase Auth for email-only authentication. Set up auth helpers and middleware in the Next.js app.

## Prompt 5: Next.js Project Bootstrap

Initialize Next.js with TypeScript, Tailwind CSS, and shadcn/ui. Configure Supabase client and environment variables.

## Prompt 6: Domain API Routes

Create REST API route handlers: `GET /api/domains` (with pagination and filters) and `GET /api/domains/[id]`.

## Prompt 7: Video Mentions API

Create REST API route: `GET /api/videos/[id]/mentions` to fetch domain mentions for a specific video.

## Prompt 8: Seed Data Script

Write a Python script to seed the database with realistic fake data (100+ domains, 50+ videos, 500+ comments).

## Prompt 9: Basic Domain Dashboard UI

Create the main domains table view with sorting, pagination, and basic filters (date range, min mentions).

## Prompt 10: CI/CD Pipeline

Set up GitHub Actions for linting, testing, and auto-deploy to Vercel on push to main branch.
