"use client";

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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface WelcomeFormProps {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  nextPath: string;
}

export function WelcomeForm({ user, nextPath }: WelcomeFormProps) {
  const t = useTranslations("welcome");
  const profileT = useTranslations("profile");
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    const result = await updateProfile(formData);
    setLoading(false);

    if (result.error) {
      toast({
        title: profileT("updateError"),
        description: result.error,
        variant: "destructive",
      });
    } else {
      router.push(nextPath);
    }
  }

  return (
    <main className="page-main flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback>{user.name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <Form action={onSubmit}>
          <CardPanel className="space-y-5">
            <Field>
              <FieldLabel>{profileT("name")}</FieldLabel>
              <Input
                name="name"
                defaultValue={user.name ?? ""}
                placeholder={profileT("namePlaceholder")}
                required
                aria-required="true"
              />
            </Field>

            <Field>
              <FieldLabel>{profileT("username")}</FieldLabel>
              <Input
                name="username"
                defaultValue={user.username ?? ""}
                placeholder={profileT("usernamePlaceholder")}
                pattern="^[a-z0-9-]{1,20}$"
              />
              <FieldDescription>
                {profileT("usernameValidation")}
              </FieldDescription>
            </Field>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("saving") : t("continue")}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push(nextPath)}
            >
              {t("skip")}
            </Button>
          </CardPanel>
        </Form>
      </Card>
    </main>
  );
}
