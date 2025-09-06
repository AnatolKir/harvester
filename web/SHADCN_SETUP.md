# shadcn/ui Components Setup

This document outlines the shadcn/ui components that have been installed and configured for the TikTok Domain Harvester dashboard.

## Installed Components

### Core UI Components

- ✅ **Alert** - System status notifications and warnings
- ✅ **Badge** - Status indicators and counters
- ✅ **Button** - Primary actions and interactions
- ✅ **Card** - Container for dashboard sections
- ✅ **Dialog** - Modal windows for detailed views
- ✅ **Dropdown Menu** - Action menus and selections
- ✅ **Input** - Form inputs for search and filters
- ✅ **Pagination** - Table navigation controls
- ✅ **Select** - Dropdown selections for filters
- ✅ **Skeleton** - Loading state placeholders
- ✅ **Table** - Data display for domains and analytics
- ✅ **Tabs** - Navigation between dashboard sections

### Custom Components

- ✅ **Data Table** - Enhanced table with sorting and filtering
- ✅ **Stats Card** - Dashboard metric displays

## Configuration Files

### `components.json`

Defines shadcn/ui configuration with:

- Default style theme
- Tailwind CSS variables enabled
- Component aliases for easy imports
- TypeScript support

### `tailwind.config.ts`

Extended with shadcn/ui color tokens:

- CSS custom properties for theming
- Dark/light mode support
- Border radius variables
- Typography configuration

### `globals.css`

CSS variable definitions for:

- Color palette (light/dark themes)
- Border radius values
- Chart color scheme
- Font configuration

## Usage Examples

### Import Components

```typescript
// Individual imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Bulk import from index
import { Badge, Dialog, DialogContent, Table } from "@/components/ui";
```

### Dashboard Stats Cards

```typescript
import { StatsCard } from "@/components/ui/stats-card"
import { Globe } from "lucide-react"

<StatsCard
  title="Total Domains"
  value={1234}
  description="+15% from last month"
  icon={<Globe className="h-4 w-4" />}
  trend={{
    value: 15,
    label: "from last month",
    isPositive: true
  }}
/>
```

### Data Table with Domains

```typescript
import { DataTable } from "@/components/ui/data-table"

const columns = [
  {
    accessorKey: "domain",
    header: "Domain",
  },
  {
    accessorKey: "total_mentions",
    header: "Mentions",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.getValue("total_mentions")}
      </Badge>
    ),
  },
]

<DataTable columns={columns} data={domains} loading={isLoading} />
```

### Filter Bar

```typescript
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

<div className="flex gap-4">
  <Input placeholder="Search domains..." />
  <Select>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Time range" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="today">Today</SelectItem>
      <SelectItem value="week">This Week</SelectItem>
    </SelectContent>
  </Select>
  <Button>Apply Filters</Button>
</div>
```

### Domain Details Modal

```typescript
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Domain Details</DialogTitle>
      <DialogDescription>
        Information about {domain.domain}
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4">
      {/* Domain details content */}
    </div>
  </DialogContent>
</Dialog>
```

### Loading States

```typescript
import { Skeleton } from "@/components/ui/skeleton"

function DomainTableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
```

### Status Badges

```typescript
import { Badge } from "@/components/ui/badge"

// Status indicators
<Badge variant="default">New</Badge>
<Badge variant="secondary">Active</Badge>
<Badge variant="destructive">Suspicious</Badge>
<Badge variant="outline">Verified</Badge>
```

### System Alerts

```typescript
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle } from "lucide-react"

<Alert>
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>System Online</AlertTitle>
  <AlertDescription>
    Domain harvesting is running normally. Last update: 2 minutes ago.
  </AlertDescription>
</Alert>
```

## Demo Components

Two comprehensive demo files have been created:

### `src/components/examples/dashboard-components-demo.tsx`

Complete interactive dashboard example showing:

- Stats cards with mock data
- Tabbed navigation
- Filter controls
- Data table with actions
- Modal dialogs
- Loading states
- Status alerts

### `src/components/examples/component-patterns.tsx`

Individual component patterns for:

- Dashboard statistics
- Domain status badges
- Filter and search bars
- Domain details modals
- Action dropdown menus
- Loading skeletons
- System alerts

## Theme Customization

The setup supports:

- **Light/Dark mode** - Automatic theme switching
- **Custom colors** - HSL-based color system
- **Typography** - Geist Sans and Geist Mono fonts
- **Responsive design** - Mobile-first breakpoints
- **Animations** - Smooth transitions with tailwindcss-animate

## Integration with Existing Code

All components are designed to work seamlessly with:

- **Next.js 15** - App Router and Server Components
- **TypeScript** - Full type safety
- **Tailwind CSS v4** - Latest styling system
- **Lucide Icons** - Consistent iconography
- **Existing types** - Domain, DashboardStats, etc.

## Development Workflow

1. Import components from `@/components/ui/`
2. Use provided patterns from examples
3. Customize with Tailwind classes
4. Follow TypeScript interfaces
5. Test with existing data types

The setup is now complete and ready for dashboard development!
