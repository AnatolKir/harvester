# TikTok Domain Harvester - Web Dashboard

A modern Next.js 14+ dashboard application for tracking and analyzing domains discovered from TikTok comments and promotional content.

## Features

- **Modern Stack**: Next.js 14+ with App Router, TypeScript, and Tailwind CSS
- **Responsive Design**: Mobile-first design with responsive tables and layouts
- **Data Visualization**: Interactive charts and statistics cards
- **Sortable Tables**: Advanced data tables with sorting and filtering
- **Dashboard Interface**: Real-time metrics and domain discovery tracking
- **Component Library**: Built with shadcn/ui and Radix UI components

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom design system
- **Components**: shadcn/ui + Radix UI primitives
- **Icons**: Lucide React
- **Tables**: TanStack Table for advanced data handling
- **Database**: Supabase integration ready
- **Deployment**: Optimized for Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── domains/           # Domain listing page
│   ├── globals.css        # Global styles and CSS variables
│   ├── layout.tsx         # Root layout component
│   └── page.tsx          # Dashboard homepage
├── components/            # Reusable React components
│   ├── layout/           # Layout components (Header, Sidebar)
│   └── ui/               # UI components (Button, Card, Table, etc.)
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Supabase client configuration
│   └── utils.ts          # Common utility functions
└── types/                # TypeScript type definitions
    └── index.ts          # Domain and API types
```

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis (Upstash) - for rate limiting
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

## Deployment

This application is optimized for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on pushes to main branch

## Design System

The application uses a custom design system with:

- **Color Palette**: Light/dark mode support with CSS custom properties
- **Typography**: Geist font family (sans & mono)
- **Spacing**: Consistent spacing scale using Tailwind
- **Components**: Accessible components built on Radix UI primitives
- **Responsive**: Mobile-first responsive design

## Key Pages

- **Dashboard (/)**: Overview with key metrics and recent activity
- **Domains (/domains)**: Comprehensive domain listing with search and filters
- **Domain Detail (/domains/[id])**: Mentions, related videos, and activity for a specific domain
- **Videos (/videos)**: Server-rendered list with search, sorting, and cursor pagination

## Development Guidelines

- Use Server Components by default, Client Components when needed
- Follow the existing component structure in `/components/ui`
- Implement proper TypeScript types in `/types`
- Use the `cn()` utility for conditional className merging
- Format code with Prettier before committing
- Ensure all components are accessible (ARIA labels, keyboard navigation)

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new features
3. Test responsive design on different screen sizes
4. Run linting and type checking before committing
5. Update this README for significant changes
