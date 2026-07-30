"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

const MIN_PASSWORD_LENGTH = 12;

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "SEEKER" as Role,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
      });
      toast.success("Account created");
      router.push(form.role === "SEEKER" ? "/search" : "/dashboard");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : "Could not create that account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Save searches, get alerts, and list your own property.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Two roles only. ADMIN is not offered because the backend
                downgrades any such request to SEEKER — showing it would be a lie. */}
            <div className="space-y-2">
              <Label>I want to</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "SEEKER", label: "Find a home" },
                    { value: "OWNER", label: "List a property" },
                  ] as const
                ).map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={form.role === option.value ? "default" : "outline"}
                    onClick={() => setForm({ ...form, role: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                required
                maxLength={120}
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                pattern="\+?[0-9]{7,15}"
                title="7 to 15 digits, optionally starting with +"
                placeholder="+919876543210"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                At least {MIN_PASSWORD_LENGTH} characters. Length beats complexity rules.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
