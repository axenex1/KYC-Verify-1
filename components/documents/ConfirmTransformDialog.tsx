"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DocumentTransform } from "@/lib/documents/transforms";

interface ConfirmTransformDialogProps {
  pendingTransform: DocumentTransform;
  onConfirm: () => void;
  onDecline: () => void;
}

function formatTransform(t: DocumentTransform): string {
  return `scale ${t.scale.toFixed(2)}×, rotation ${t.rotationDeg}°, warp X ${t.skewX.toFixed(2)}, warp Y ${t.skewY.toFixed(2)}`;
}

export function ConfirmTransformDialog({
  pendingTransform,
  onConfirm,
  onDecline,
}: ConfirmTransformDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onDecline()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply adjustment?</DialogTitle>
          <DialogDescription>
            Do you wish to apply this adjustment now? All changes are logged to
            the audit trail.
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          {formatTransform(pendingTransform)}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onDecline}>
            No, keep current
          </Button>
          <Button onClick={onConfirm}>Yes, apply now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
