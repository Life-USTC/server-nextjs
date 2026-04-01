"use client";

import { User as UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Link } from "@/i18n/routing";
import { signIn, signOut, useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  className?: string;
};

export function UserMenu({ className }: UserMenuProps) {
  const tProfile = useTranslations("profile");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();

  const menuLabel = session ? tProfile("title") : tCommon("signIn");
  const avatarFallback = session?.user?.name?.charAt(0) ?? menuLabel.charAt(0);
  const profileHref = session?.user?.username
    ? `/u/${session.user.username}`
    : session?.user?.id
      ? `/u/id/${session.user.id}`
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
              <MenuItem render={<Link href="/" />}>{tCommon("home")}</MenuItem>
              <MenuItem render={<Link href={profileHref} />}>
                {tCommon("me")}
              </MenuItem>
              <MenuItem render={<Link href="/settings?tab=profile" />}>
                {tSettings("title")}
              </MenuItem>
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
