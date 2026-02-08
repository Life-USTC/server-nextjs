"use client";

import { User as UserIcon } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  className?: string;
};

export function UserMenu({ className }: UserMenuProps) {
  const tProfile = useTranslations("profile");
  const tMe = useTranslations("meDashboard");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();

  const menuLabel = session ? tProfile("title") : tCommon("signIn");
  const avatarFallback = session?.user?.name?.charAt(0) ?? menuLabel.charAt(0);

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
              {session?.user?.image ? (
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={session.user.image}
                    alt={session.user.name || menuLabel}
                  />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </Button>
          }
        />
        <MenuPopup>
          {session ? (
            <>
              <MenuItem className="font-medium" disabled>
                {session.user?.name || tProfile("title")}
              </MenuItem>
              <MenuSeparator />
              <MenuItem render={<Link href="/dashboard" />}>
                {tCommon("me")}
              </MenuItem>
              <MenuItem render={<Link href="/settings/profile" />}>
                {tSettings("title")}
              </MenuItem>
              {session.user?.username ? (
                <MenuItem
                  render={<Link href={`/u/${session.user.username}`} />}
                >
                  {tMe("links.publicProfile")}
                </MenuItem>
              ) : (
                <MenuItem render={<Link href={`/u/id/${session.user.id}`} />}>
                  {tMe("links.publicProfileId")}
                </MenuItem>
              )}
              <MenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                {tProfile("signOut")}
              </MenuItem>
            </>
          ) : (
            <MenuItem onClick={() => signIn()}>{tCommon("signIn")}</MenuItem>
          )}
        </MenuPopup>
      </Menu>
    </div>
  );
}
