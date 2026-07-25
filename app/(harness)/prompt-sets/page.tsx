"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Pencil, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CustomPromptSet, CustomPromptItem } from "@/lib/prompt-sets/types";
import { AVAILABLE_PROMPT_IDS } from "@/lib/prompt-sets/types";

const PROMPT_LABELS: Record<string, string> = {
  center_face: "Center face",
  blink_twice: "Blink twice",
  turn_left: "Turn head left",
  turn_right: "Turn head right",
  smile: "Smile",
  hold_still: "Hold still",
};

const DEFAULT_ITEM: Omit<CustomPromptItem, "id"> = {
  timeoutMs: 15000,
  maxAttempts: 3,
};

interface EditState {
  name: string;
  description: string;
  prompts: CustomPromptItem[];
}

const EMPTY_EDIT: EditState = {
  name: "",
  description: "",
  prompts: [{ id: "center_face", ...DEFAULT_ITEM }],
};

export default function PromptSetsPage() {
  const [sets, setSets] = useState<CustomPromptSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditState>(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/prompt-sets");
      if (res.ok) {
        const data = (await res.json()) as { promptSets: CustomPromptSet[] };
        setSets(data.promptSets);
      }
    } catch {
      toast.error("Failed to load prompt sets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_EDIT);
    setDialogOpen(true);
  };

  const openEdit = (set: CustomPromptSet) => {
    setEditingId(set.id);
    setForm({
      name: set.name,
      description: set.description ?? "",
      prompts: set.prompts.map((p) => ({ ...p })),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (form.prompts.length === 0) {
      toast.error("At least one prompt is required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        prompts: form.prompts,
      };

      const url = editingId ? `/api/prompt-sets/${editingId}` : "/api/prompt-sets";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? "Prompt set updated" : "Prompt set created");
        setDialogOpen(false);
        await load();
      } else {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/prompt-sets/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Prompt set deleted");
        setDeleteConfirmId(null);
        await load();
      } else {
        toast.error("Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  const addPromptItem = () => {
    const usedIds = new Set(form.prompts.map((p) => p.id));
    const nextId = AVAILABLE_PROMPT_IDS.find((id) => !usedIds.has(id));
    if (!nextId) {
      toast.error("All available prompts already added");
      return;
    }
    setForm((f) => ({
      ...f,
      prompts: [...f.prompts, { id: nextId, ...DEFAULT_ITEM }],
    }));
  };

  const removePromptItem = (index: number) => {
    setForm((f) => ({
      ...f,
      prompts: f.prompts.filter((_, i) => i !== index),
    }));
  };

  const movePrompt = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= form.prompts.length) return;
    setForm((f) => {
      const next = [...f.prompts];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, prompts: next };
    });
  };

  const updatePromptItem = (index: number, patch: Partial<CustomPromptItem>) => {
    setForm((f) => ({
      ...f,
      prompts: f.prompts.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  };

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Prompt Sets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build, save, and reuse custom liveness prompt sequences.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Prompt Set
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : sets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-zinc-500">
              No custom prompt sets yet.{" "}
              <button
                type="button"
                className="text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
                onClick={openCreate}
              >
                Create one
              </button>{" "}
              to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sets.map((set) => (
            <Card key={set.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{set.name}</CardTitle>
                    {set.description && (
                      <CardDescription className="mt-0.5">
                        {set.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(set)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmId(set.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {set.prompts.map((p, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">
                      {PROMPT_LABELS[p.id] ?? p.id}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {set.prompts.length} prompt{set.prompts.length !== 1 ? "s" : ""}
                  {" · "}
                  Created {new Date(set.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Prompt Set" : "New Prompt Set"}
            </DialogTitle>
            <DialogDescription>
              Choose prompts, order them, and set timeout / attempt limits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ps-name">Name</Label>
              <Input
                id="ps-name"
                placeholder="e.g., Quick selfie check"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ps-desc">Description (optional)</Label>
              <Input
                id="ps-desc"
                placeholder="Short description for this set"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Prompts</Label>
              <div className="space-y-2">
                {form.prompts.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-zinc-400" />

                    <select
                      className="flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      value={item.id}
                      onChange={(e) =>
                        updatePromptItem(i, { id: e.target.value as typeof item.id })
                      }
                    >
                      {AVAILABLE_PROMPT_IDS.map((id) => (
                        <option key={id} value={id}>
                          {PROMPT_LABELS[id] ?? id}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-zinc-500">Timeout</span>
                      <input
                        type="number"
                        className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        value={item.timeoutMs / 1000}
                        min={1}
                        max={60}
                        onChange={(e) =>
                          updatePromptItem(i, {
                            timeoutMs: Math.max(1000, Number(e.target.value) * 1000),
                          })
                        }
                      />
                      <span className="text-xs text-zinc-400">s</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-zinc-500">Attempts</span>
                      <input
                        type="number"
                        className="w-14 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        value={item.maxAttempts}
                        min={1}
                        max={10}
                        onChange={(e) =>
                          updatePromptItem(i, {
                            maxAttempts: Math.max(1, Number(e.target.value)),
                          })
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => movePrompt(i, -1)}
                        disabled={i === 0}
                        className="disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePrompt(i, 1)}
                        disabled={i === form.prompts.length - 1}
                        className="disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removePromptItem(i)}
                      disabled={form.prompts.length <= 1}
                      className="disabled:opacity-30"
                      aria-label="Remove prompt"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>

              {form.prompts.length < AVAILABLE_PROMPT_IDS.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPromptItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add prompt
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete prompt set?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Sessions that referenced this set will keep
              their recorded prompt results.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
