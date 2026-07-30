"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}

function LoginView() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Only same-site paths are honoured, so a crafted ?next=https://evil.example
  // cannot turn the login page into an open redirect.
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/search";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back");
      router.push(next);
    } catch (caught) {
      // The API returns the same message whether the email is unknown or the
      // password is wrong, and it is shown verbatim for the same reason.
      setError(caught instanceof ApiError ? caught.userMessage : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your listings, enquiries and saved searches.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
