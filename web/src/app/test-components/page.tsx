import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle } from "lucide-react";

export default function TestComponentsPage() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <h1 className="text-3xl font-bold">shadcn/ui Components Test</h1>

      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Success!</AlertTitle>
        <AlertDescription>
          All shadcn/ui components have been successfully installed and
          configured.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Button Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button>Default Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="destructive">Destructive</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badge Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loading Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>✅ Components Successfully Installed</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <li>✅ Alert</li>
            <li>✅ Badge</li>
            <li>✅ Button</li>
            <li>✅ Card</li>
            <li>✅ Dialog</li>
            <li>✅ Dropdown Menu</li>
            <li>✅ Input</li>
            <li>✅ Pagination</li>
            <li>✅ Select</li>
            <li>✅ Skeleton</li>
            <li>✅ Table</li>
            <li>✅ Tabs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
