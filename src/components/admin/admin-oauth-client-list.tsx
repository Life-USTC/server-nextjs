"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  type CreateOAuthClientResult,
  createOAuthClient,
  deleteOAuthClient,
  toggleOAuthClientStatus,
} from "@/app/actions/oauth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type OAuthClientEntry = {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  isActive: boolean;
  createdAt: Date;
};

interface AdminOAuthClientListProps {
  clients: OAuthClientEntry[];
}

export function AdminOAuthClientList({
  clients: initialClients,
}: AdminOAuthClientListProps) {
  const t = useTranslations("adminOAuth");
  const { toast } = useToast();
  const [clients, setClients] = useState(initialClients);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newClientSecret, setNewClientSecret] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);

  async function handleCreate(formData: FormData) {
    setCreating(true);
    const result: CreateOAuthClientResult = await createOAuthClient(formData);
    setCreating(false);

    if ("error" in result) {
      toast({
        title: t("createError"),
        description: result.error,
        variant: "destructive",
      });
    } else {
      setCreateDialogOpen(false);
      setNewClientSecret({
        clientId: result.clientId,
        clientSecret: result.clientSecret,
      });
      // Add the new client to local state
      setClients((prev) => [result.client, ...prev]);
    }
  }

  async function handleToggle(id: string, currentlyActive: boolean) {
    const result = await toggleOAuthClientStatus(id, !currentlyActive);
    if ("error" in result) {
      toast({
        title: t("updateError"),
        description: result.error,
        variant: "destructive",
      });
    } else {
      setClients((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, isActive: !currentlyActive } : c,
        ),
      );
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteOAuthClient(id);
    if ("error" in result) {
      toast({
        title: t("deleteError"),
        description: result.error,
        variant: "destructive",
      });
    } else {
      setClients((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger render={<Button />}>{t("createClient")}</DialogTrigger>
          <DialogPopup>
            <DialogHeader>
              <DialogTitle>{t("createClient")}</DialogTitle>
              <DialogDescription>
                {t("createClientDescription")}
              </DialogDescription>
            </DialogHeader>
            <Form action={handleCreate}>
              <div className="space-y-4 p-4">
                <Field>
                  <FieldLabel>{t("clientName")}</FieldLabel>
                  <Input
                    name="name"
                    required
                    placeholder={t("clientNamePlaceholder")}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("clientDescription")}</FieldLabel>
                  <Input
                    name="description"
                    placeholder={t("clientDescriptionPlaceholder")}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("redirectUris")}</FieldLabel>
                  <Textarea
                    name="redirectUris"
                    required
                    placeholder={t("redirectUrisPlaceholder")}
                    rows={3}
                  />
                  <FieldDescription>{t("redirectUrisHint")}</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>{t("scopes")}</FieldLabel>
                  <Input
                    name="scopes"
                    defaultValue="profile"
                    placeholder="profile"
                  />
                  <FieldDescription>{t("scopesHint")}</FieldDescription>
                </Field>
              </div>
              <DialogFooter>
                <DialogClose
                  render={<Button type="button" variant="outline" />}
                >
                  {t("cancel")}
                </DialogClose>
                <Button type="submit" disabled={creating}>
                  {creating ? t("creating") : t("create")}
                </Button>
              </DialogFooter>
            </Form>
          </DialogPopup>
        </Dialog>
      </div>

      {/* New client secret reveal dialog */}
      <Dialog
        open={!!newClientSecret}
        onOpenChange={(open) => {
          if (!open) setNewClientSecret(null);
        }}
      >
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>{t("clientCreated")}</DialogTitle>
            <DialogDescription>
              {t("clientCreatedDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-4">
            <Field>
              <FieldLabel>{t("clientIdLabel")}</FieldLabel>
              <Input readOnly value={newClientSecret?.clientId ?? ""} />
            </Field>
            <Field>
              <FieldLabel>{t("clientSecretLabel")}</FieldLabel>
              <Input readOnly value={newClientSecret?.clientSecret ?? ""} />
              <FieldDescription>{t("saveSecretHint")}</FieldDescription>
            </Field>
          </div>
          <DialogFooter>
            <DialogClose render={<Button />}>{t("done")}</DialogClose>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      {clients.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("noClients")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>{client.name}</CardTitle>
                    <Badge variant={client.isActive ? "default" : "secondary"}>
                      {client.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(client.id, client.isActive)}
                    >
                      {client.isActive ? t("deactivate") : t("activate")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(client.id)}
                    >
                      {t("delete")}
                    </Button>
                  </div>
                </div>
                {client.description && (
                  <CardDescription>{client.description}</CardDescription>
                )}
              </CardHeader>
              <CardPanel className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">{t("clientIdLabel")}: </span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {client.clientId}
                  </code>
                </div>
                <div>
                  <span className="font-medium">{t("redirectUris")}: </span>
                  <ul className="mt-1 space-y-0.5">
                    {client.redirectUris.map((uri) => (
                      <li key={uri}>
                        <code className="text-xs">{uri}</code>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-medium">{t("scopes")}: </span>
                  {client.scopes.join(", ")}
                </div>
              </CardPanel>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
