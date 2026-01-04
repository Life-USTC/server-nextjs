"use client";

import { Calendar, ChevronRight, DoorOpen, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "@/i18n/routing";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode[];
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const tAuth = useTranslations("auth");
  const tBreadcrumbs = useTranslations("breadcrumbs");

  // Generate breadcrumbs based on current path if not provided
  const defaultBreadcrumbs = useMemo(() => {
    if (breadcrumbs) return breadcrumbs;

    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href?: string }[] = [
      { label: tBreadcrumbs("home"), href: "/" },
    ];

    if (segments.length > 0) {
      if (segments[0] === "courses") {
        crumbs.push({ label: tBreadcrumbs("courses"), href: "/courses" });
        if (segments[1]) {
          crumbs.push({ label: tBreadcrumbs("courseDetail") });
        }
      } else if (segments[0] === "sections") {
        crumbs.push({ label: tBreadcrumbs("sections"), href: "/sections" });
        if (segments[1]) {
          crumbs.push({ label: tBreadcrumbs("sectionDetail") });
        }
      } else if (segments[0] === "me") {
        crumbs.push({ label: tBreadcrumbs("profile"), href: "/me" });
        if (segments[1] === "subscriptions" && segments[2] === "sections") {
          crumbs.push({
            label: tBreadcrumbs("mySubscriptions"),
            href: "/me/subscriptions/sections",
          });
        }
      }
    }

    return crumbs;
  }, [pathname, breadcrumbs, tBreadcrumbs]);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
            <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb and User Controls Row */}
      <div className="flex items-center justify-between mb-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {defaultBreadcrumbs.map((crumb, index) => (
            <div
              key={`${crumb.label}-${index}`}
              className="flex items-center gap-1.5"
            >
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">
                  {crumb.label}
                </span>
              )}
              {index < defaultBreadcrumbs.length - 1 && (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          ))}
        </nav>

        {/* User Controls */}
        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user.avatar || undefined}
                        alt={user.name}
                      />
                      <AvatarFallback>
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={
                    <Link href="/me" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      {tAuth("profile")}
                    </Link>
                  }
                />
                <DropdownMenuItem
                  render={
                    <Link
                      href="/me/subscriptions/sections"
                      className="flex items-center"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {tAuth("mySubscriptions")}
                    </Link>
                  }
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => signOut()}
                >
                  <DoorOpen className="mr-2 h-4 w-4" />
                  {tAuth("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              render={<Link href="/api/auth/signin">{tAuth("signIn")}</Link>}
            />
          )}
        </div>
      </div>

      {/* Page Title and Actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display">
              {title ||
                defaultBreadcrumbs[defaultBreadcrumbs.length - 1]?.label}
            </h1>
            {subtitle && (
              <p className="text-subtitle text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && actions.length > 0 && (
            <div className="flex gap-2">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}
