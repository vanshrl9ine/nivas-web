"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Building2, Inbox, LayoutDashboard, LogOut, Search, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/saved-searches", label: "Saved", icon: Bookmark, requiresAuth: true },
  { href: "/dashboard", label: "My listings", icon: LayoutDashboard, requiresOwner: true },
  { href: "/dashboard/leads", label: "Enquiries", icon: Inbox, requiresOwner: true },
];

export function SiteHeader() {
  const { user, loading, logout, isOwner } = useAuth();
  const pathname = usePathname();

  const visibleLinks = NAV_LINKS.filter((link) => {
    if (link.requiresOwner) return isOwner;
    if (link.requiresAuth) return Boolean(user);
    return true;
  });

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Building2 className="size-5" />
          <span>Nivas</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          {visibleLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(active && "bg-accent text-accent-foreground")}
              >
                <Link href={link.href}>
                  <link.icon className="size-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>

        {/* Renders a placeholder rather than the signed-out state while the
            session is being restored, so a signed-in user never sees a
            "Sign in" button flash on every page load. */}
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <User className="size-4" />
                <span className="hidden max-w-32 truncate sm:inline">
                  {user.fullName ?? user.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="truncate text-sm font-medium">{user.fullName ?? "Account"}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                <div className="mt-1 text-xs text-muted-foreground">{user.role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isOwner && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/listings/new">List a property</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => void logout()}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
