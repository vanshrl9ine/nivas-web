"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { savedSearchApi } from "@/lib/api/endpoints";
import type { AlertFrequency, SearchCriteria } from "@/lib/api/types";

const FREQUENCY_LABELS: Record<AlertFrequency, string> = {
  NONE: "Don't alert me",
  INSTANT: "As soon as something matches",
  DAILY: "A daily digest",
  WEEKLY: "A weekly digest",
};

export function SaveSearchDialog({
  criteria,
  children,
  onSaved,
}: {
  criteria: SearchCriteria;
  children: React.ReactNode;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<AlertFrequency>("DAILY");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Give this search a name.");
      return;
    }
    setSaving(true);
    try {
      // Paging is stripped before saving: "page 3 of my search" is not a search,
      // and storing it would make an alert start from an arbitrary offset.
      const filters: SearchCriteria = { ...criteria };
      delete filters.page;
      delete filters.size;

      await savedSearchApi.create({
        name: name.trim(),
        criteria: filters,
        alertFrequency: frequency,
      });

      toast.success(`Saved "${name.trim()}"`);
      setOpen(false);
      setName("");
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.userMessage : "Could not save that search");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
          <DialogDescription>
            Your filters are stored exactly as they are now. Alerts only ever include listings
            published since the last time you were told.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="saved-search-name">Name</Label>
            <Input
              id="saved-search-name"
              placeholder="2 BHK under 40k in Koramangala"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void save();
              }}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="saved-search-frequency">Alert me</Label>
            <Select
              value={frequency}
              onValueChange={(value) => setFrequency(value as AlertFrequency)}
            >
              <SelectTrigger id="saved-search-frequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FREQUENCY_LABELS) as AlertFrequency[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {FREQUENCY_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save search"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
