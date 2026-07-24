"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DevUiPage() {
  const [progress, setProgress] = useState(42);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">UI Component Lab</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal showcase for interactive states — not linked from prod nav.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>
            Hover, focus-visible, disabled, and loading states
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button onClick={() => toast.success("Toast fired")}>Toast</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badges & Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
          </div>
          <div className="space-y-2">
            <Label htmlFor="progress-demo">Progress ({progress}%)</Label>
            <Progress value={progress} id="progress-demo" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProgress((p) => (p >= 100 ? 0 : p + 10))}
            >
              Advance
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form controls</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-sm gap-3">
          <div className="space-y-2">
            <Label htmlFor="demo-input">Session label</Label>
            <Input id="demo-input" placeholder="qa-session-01" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabs / Dialog / Sheet / Tooltip</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="liveness">
            <TabsList>
              <TabsTrigger value="liveness">Liveness</TabsTrigger>
              <TabsTrigger value="document">Document QA</TabsTrigger>
            </TabsList>
            <TabsContent value="liveness" className="text-sm text-muted-foreground">
              Prompt sequencing panel content
            </TabsContent>
            <TabsContent value="document" className="text-sm text-muted-foreground">
              Transform controls panel content
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm transform</DialogTitle>
                  <DialogDescription>
                    Apply scale/rotation adjustments to the document preview?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Apply</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>QA side panel</SheetTitle>
                  <SheetDescription>
                    Dense controls for pairing and transforms.
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost">Hover tip</Button>
              </TooltipTrigger>
              <TooltipContent>Keyboard-friendly focus rings active</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skeletons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
