"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { updateProfile } from "@/app/actions/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ProfileEditFormProps {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    profilePictures: string[];
  };
}

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const t = useTranslations("profile");
  const a11yT = useTranslations("accessibility");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(user.image || "");

  async function onSubmit(formData: FormData) {
    setLoading(true);
    // Append the selected image explicitly if it's not the default
    if (selectedImage !== user.image) {
      formData.set("image", selectedImage);
    }

    const result = await updateProfile(formData);
    setLoading(false);

    if (result.error) {
      toast({
        title: t("updateError"),
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("updateSuccess"),
        description: t("updateSuccessDescription"),
        variant: "success",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("editProfile")}</CardTitle>
        <CardDescription>{t("editProfileDescription")}</CardDescription>
      </CardHeader>
      <form action={onSubmit}>
        <CardContent className="space-y-6">
          {/* Profile Picture Selection */}
          <div className="space-y-4">
            <Label>{t("profilePicture")}</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={selectedImage} />
                <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>

              {user.profilePictures.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {user.profilePictures.map((pic) => (
                    <Button
                      key={pic}
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedImage(pic)}
                      className={`relative h-12 w-12 rounded-full overflow-hidden border-2 transition-all p-0 ${
                        selectedImage === pic
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent hover:border-border"
                      }`}
                    >
                      <Image
                        src={pic}
                        alt={a11yT("avatarOption")}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name || ""}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                name="username"
                defaultValue={user.username || ""}
                placeholder={t("usernamePlaceholder")}
                pattern="[a-z0-9]{1,20}"
                title={t("usernameValidation")}
              />
              <p className="text-xs text-muted-foreground">
                {t("usernameHint")}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? t("saving") : t("save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
