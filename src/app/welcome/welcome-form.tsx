"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { updateProfile } from "@/app/actions/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/auth/client";

interface WelcomeFormProps {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    profilePictures: string[];
  };
}

export function WelcomeForm({ user }: WelcomeFormProps) {
  const t = useTranslations("welcome");
  const profileT = useTranslations("profile");
  const a11yT = useTranslations("accessibility");
  const { toast } = useToast();
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(user.image || "");

  async function onSubmit(formData: FormData) {
    setLoading(true);

    if (selectedImage !== user.image) {
      formData.set("image", selectedImage);
    }

    const result = await updateProfile(formData);
    setLoading(false);

    if (result.error) {
      toast({
        title: profileT("updateError"),
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("success"),
        description: t("successDescription"),
        variant: "success",
      });
      // Refresh auth cache so proxy checks use latest profile fields.
      await update();
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <Form action={onSubmit}>
          <CardPanel className="space-y-6">
            {/* Profile Picture Selection */}
            {user.profilePictures.length > 0 && (
              <Field className="space-y-4">
                <FieldLabel>{profileT("profilePicture")}</FieldLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedImage} />
                    <AvatarFallback>
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid grid-cols-4 gap-2">
                    {user.profilePictures.map((pic) => (
                      <Button
                        key={pic}
                        type="button"
                        size={"icon-lg"}
                        onClick={() => setSelectedImage(pic)}
                        className={`relative h-12 w-12 overflow-hidden rounded-full p-0 ${
                          selectedImage === pic
                            ? "border-3 border-primary ring-2 ring-primary/30"
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
                </div>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="name">{profileT("name")}</FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={user.name || ""}
                placeholder={profileT("namePlaceholder")}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="username">{profileT("username")}</FieldLabel>
              <Input
                id="username"
                name="username"
                defaultValue={user.username || ""}
                placeholder={profileT("usernamePlaceholder")}
                pattern="[a-z0-9-]{1,20}"
                title={profileT("usernameValidation")}
                required
              />
              <p className="mt-1 text-muted-foreground text-xs">
                {profileT("usernameValidation")}
              </p>
            </Field>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? profileT("saving") : t("continue")}
            </Button>
          </CardPanel>
        </Form>
      </Card>
    </main>
  );
}
