"use client";

import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { leadApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth-context";

/**
 * Fields hold `null` until the user types in them.
 *
 * That distinction is what lets a signed-in user's details act as a default
 * without copying them into state — deriving the displayed value at render time
 * avoids an effect that writes state, and means clearing a prefilled field stays
 * cleared instead of being refilled on the next render.
 */
interface Draft {
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
}

const DEFAULT_MESSAGE = "I'd like to know more about this property.";

export function LeadForm({ propertyId }: { propertyId: string }) {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    name: null,
    email: null,
    phone: null,
    message: null,
  });

  /**
   * One key per form, generated on first submit and then reused.
   *
   * That is what makes a double-submitted enquiry safe: both requests carry the
   * same key, the backend's partial unique index rejects the second, and the
   * service returns the lead the first one created. Generating it per click
   * would defeat the mechanism entirely. It is created in the event handler
   * rather than during render because `randomUUID` is impure.
   */
  const idempotencyKeyRef = useRef<string | null>(null);

  const name = draft.name ?? user?.fullName ?? "";
  const email = draft.email ?? user?.email ?? "";
  const phone = draft.phone ?? user?.phone ?? "";
  const message = draft.message ?? DEFAULT_MESSAGE;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    idempotencyKeyRef.current ??= `${propertyId}-${crypto.randomUUID()}`;

    setSending(true);
    try {
      await leadApi.create(
        propertyId,
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim() || null,
          source: "WEB",
        },
        idempotencyKeyRef.current,
      );
      setSubmitted(true);
      toast.success("Enquiry sent — the owner will be in touch.");
    } catch (error) {
      // The backend allows five enquiries an hour per caller, and reports how
      // long to wait in the Retry-After header.
      toast.error(error instanceof ApiError ? error.userMessage : "Could not send that enquiry");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <p className="font-medium">Enquiry sent</p>
        <p className="text-sm text-muted-foreground">
          The owner has your details and will get back to you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="lead-name">Your name</Label>
        <Input
          id="lead-name"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lead-email">Email</Label>
        <Input
          id="lead-email"
          type="email"
          required
          value={email}
          onChange={(event) => setDraft({ ...draft, email: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lead-phone">Phone</Label>
        <Input
          id="lead-phone"
          required
          // Matches the backend's pattern: 7-15 digits, optional leading +.
          pattern="\+?[0-9]{7,15}"
          title="7 to 15 digits, optionally starting with +"
          placeholder="+919876543210"
          value={phone}
          onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lead-message">Message</Label>
        <Textarea
          id="lead-message"
          rows={3}
          maxLength={1000}
          value={message}
          onChange={(event) => setDraft({ ...draft, message: event.target.value })}
        />
      </div>

      <Button type="submit" className="w-full" disabled={sending}>
        {sending ? "Sending…" : "Send enquiry"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        No account needed. Your details go only to this owner.
      </p>
    </form>
  );
}
