"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";

/**
 * Client-side route guard.
 *
 * This is a UX affordance, not a security control — every protected endpoint is
 * enforced by the API, which re-verifies the token on each request. All this does
 * is send someone to the login page instead of showing them a screen full of 401s.
 */
export function RequireAuth({
  children,
  ownerOnly = false,
}: {
  children: React.ReactNode;
  ownerOnly?: boolean;
}) {
  const { user, loading, isOwner } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = Boolean(user) && (!ownerOnly || isOwner);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Carry the intended destination so sign-in returns them here.
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (ownerOnly && !isOwner) {
      router.replace("/search");
    }
  }, [loading, user, isOwner, ownerOnly, pathname, router]);

  if (loading || !allowed) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
