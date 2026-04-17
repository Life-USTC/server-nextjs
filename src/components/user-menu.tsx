"use client";

import { User as UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Link } from "@/i18n/routing";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  className?: string;
  initialUser?: {
    id: string;
    name: string | null;
    image: string | null;
    username: string | null;
  } | null;
};

export function UserMenu({ className, initialUser = null }: UserMenuProps) {
  const tProfile = useTranslations("profile");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const user = initialUser;

  if (!user) {
    return null;
  }

  const menuLabel = tProfile("title");
  const avatarFallback = user.name?.charAt(0) ?? menuLabel.charAt(0);
  const profileHref = user.username
    ? `/u/${user.username}`
    : user.id
      ? `/u/id/${user.id}`
      : "/";

  return (
    <div className={cn("flex items-center", className)}>
      <Menu>
        <MenuTrigger
          render={
            <Button
              aria-label={menuLabel}
              className="h-9 w-9"
              size="icon"
              variant="outline"
            >
              {user.image ? (
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.image} alt={user.name || menuLabel} />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </Button>
          }
        />
        <MenuPopup>
          <MenuItem render={<Link className="no-underline" href="/" />}>
            {tCommon("home")}
          </MenuItem>
          <MenuItem
            render={<Link className="no-underline" href={profileHref} />}
          >
            {tCommon("me")}
          </MenuItem>
          <MenuItem
            render={
              <Link className="no-underline" href="/settings?tab=profile" />
            }
          >
            {tSettings("title")}
          </MenuItem>
          <MenuItem onClick={() => signOut({ callbackUrl: "/" })}>
            {tProfile("signOut")}
          </MenuItem>
        </MenuPopup>
      </Menu>
    </div>
  );
}
