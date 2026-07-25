"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentTemplatePicker } from "./DocumentTemplatePicker";
import { DocumentPreview } from "./DocumentPreview";
import {
  TransformControls,
  DEFAULT_DOCUMENT_TRANSFORM,
} from "./TransformControls";
import { ConfirmTransformDialog } from "./ConfirmTransformDialog";
import {
  DEFAULT_DOCUMENT_TEMPLATE_ID,
  DOCUMENT_TEMPLATES,
} from "@/lib/documents/templates";
import type { DocumentTransform } from "@/lib/documents/transforms";
import type { ClientAuditLogger } from "@/lib/audit/logger";

interface DocumentQAPanelProps {
  auditLogger: ClientAuditLogger;
  onStateChange?: (state: DocumentQAState) => void;
  onTransformProposed?: (transform: DocumentTransform) => void;
  onTransformApplied?: (transform: DocumentTransform) => void;
  onTransformRejected?: () => void;
}

export interface DocumentQAState {
  templateId: string;
  appliedTransform: DocumentTransform;
}

export function DocumentQAPanel({
  auditLogger,
  onStateChange,
  onTransformProposed,
  onTransformApplied,
  onTransformRejected,
}: DocumentQAPanelProps) {
  const [templateId, setTemplateId] = useState(DEFAULT_DOCUMENT_TEMPLATE_ID);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(
    null
  );
  const [appliedTransform, setAppliedTransform] = useState<DocumentTransform>(
    DEFAULT_DOCUMENT_TRANSFORM
  );
  const [pendingTransform, setPendingTransform] = useState<DocumentTransform>(
    DEFAULT_DOCUMENT_TRANSFORM
  );
  const [showConfirm, setShowConfirm] = useState(false);

  const loadTemplate = useCallback(
    (id: string) => {
      const template = DOCUMENT_TEMPLATES.find((t) => t.id === id);
      if (!template) return;

      const img = new Image();
      img.src = template.path;
      img.onload = () => {
        setTemplateImage(img);
        setTemplateId(id);
        setAppliedTransform(DEFAULT_DOCUMENT_TRANSFORM);
        setPendingTransform(DEFAULT_DOCUMENT_TRANSFORM);
        auditLogger.log("document_template_loaded", {
          templateId: id,
          label: template.label,
        });
        onStateChange?.({
          templateId: id,
          appliedTransform: DEFAULT_DOCUMENT_TRANSFORM,
        });
      };
    },
    [auditLogger, onStateChange]
  );

  useEffect(() => {
    loadTemplate(DEFAULT_DOCUMENT_TEMPLATE_ID);
  }, [loadTemplate]);

  const handleTemplateSelect = (id: string) => {
    if (id === templateId) return;
    loadTemplate(id);
  };

  const handleRequestApply = () => {
    auditLogger.log("transform_proposed", { ...pendingTransform });
    onTransformProposed?.(pendingTransform);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setAppliedTransform(pendingTransform);
    setShowConfirm(false);
    auditLogger.log("transform_applied", { ...pendingTransform });
    onTransformApplied?.(pendingTransform);
    onStateChange?.({ templateId, appliedTransform: pendingTransform });
  };

  const handleDecline = () => {
    setPendingTransform(appliedTransform);
    setShowConfirm(false);
    auditLogger.log("transform_rejected", {
      proposed: { ...pendingTransform },
      kept: { ...appliedTransform },
    });
    onTransformRejected?.();
  };

  const handleReset = () => {
    setPendingTransform(DEFAULT_DOCUMENT_TRANSFORM);
    setAppliedTransform(DEFAULT_DOCUMENT_TRANSFORM);
    auditLogger.log("transform_reset", {
      transform: { ...DEFAULT_DOCUMENT_TRANSFORM },
    });
    onStateChange?.({
      templateId,
      appliedTransform: DEFAULT_DOCUMENT_TRANSFORM,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Capture Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DocumentTemplatePicker
            selectedId={templateId}
            onSelect={handleTemplateSelect}
          />
          <DocumentPreview
            image={templateImage}
            transform={pendingTransform}
          />
          <TransformControls
            pending={pendingTransform}
            applied={appliedTransform}
            onChange={setPendingTransform}
            onRequestApply={handleRequestApply}
            onReset={handleReset}
          />
        </CardContent>
      </Card>

      {showConfirm && (
        <ConfirmTransformDialog
          pendingTransform={pendingTransform}
          onConfirm={handleConfirm}
          onDecline={handleDecline}
        />
      )}
    </>
  );
}
