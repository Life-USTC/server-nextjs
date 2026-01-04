"use client";

import {
  Bell,
  Calendar,
  CheckIcon,
  CopyIcon,
  Download,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { Link } from "@/i18n/routing";
import { addLocalizedNames, type Localized } from "@/lib/localization-helpers";
import {
  addSectionsToSubscription,
  getSubscriptionIcsUrl,
  getSubscriptionState,
  removeSectionFromSubscription,
} from "@/lib/subscription-storage";

interface SectionData {
  id: number;
  jwId: number;
  code: string;
  course: {
    nameCn: string;
    nameEn?: string;
    code: string;
  };
  semester?: {
    nameCn: string;
  };
  campus?: {
    nameCn: string;
  };
  teachers: Array<{
    nameCn: string;
  }>;
}

export default function SubscriptionsPage() {
  const t = useTranslations("common");
  const tSubscriptions = useTranslations("subscriptions");
  const locale = useLocale();
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Localize sections for display inline
  const localizeSection = (section: SectionData) => {
    addLocalizedNames(section.course, locale);
    if (section.semester) addLocalizedNames(section.semester, locale);
    if (section.campus) addLocalizedNames(section.campus, locale);
    section.teachers.forEach((t) => {
      addLocalizedNames(t, locale);
    });
    return section;
  };

  // Bulk import state
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [matchedSections, setMatchedSections] = useState<SectionData[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<number>>(
    new Set(),
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [unmatchedCodes, setUnmatchedCodes] = useState<string[]>([]);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const state = getSubscriptionState();
      const url = getSubscriptionIcsUrl();
      setSubscriptionUrl(url ? `${window.location.origin}${url}` : null);

      if (state.subscribedSections.length === 0) {
        setSections([]);
        setLoading(false);
        return;
      }

      // Fetch section details
      const response = await fetch(
        `/api/sections?ids=${state.subscribedSections.join(",")}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch sections");
      }

      const data = await response.json();
      setSections(data.data || []);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleUnsubscribe = async (sectionId: number) => {
    try {
      await removeSectionFromSubscription(sectionId);
      await loadSubscriptions(); // Reload the list
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    }
  };

  const handleCopy = async () => {
    if (!subscriptionUrl) return;

    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleFetchSections = async () => {
    if (!importText.trim()) return;

    setImporting(true);
    try {
      // Extract section codes using regex
      const codePattern = /[A-Z0-9]+\.[A-Z0-9]{2}/g;
      const extractedCodes = importText.match(codePattern) || [];

      if (extractedCodes.length === 0) {
        toastManager.add({
          type: "warning",
          title: tSubscriptions("bulkImport.noValidCodes"),
          description: tSubscriptions("bulkImport.checkFormat"),
        });
        setImporting(false);
        return;
      }

      // Remove duplicates
      const uniqueCodes = [...new Set(extractedCodes)];

      // Call API to match codes
      const response = await fetch("/api/sections/match-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: uniqueCodes }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sections");
      }

      const data = await response.json();

      setMatchedSections(data.sections || []);
      setUnmatchedCodes(data.unmatchedCodes || []);

      // Select all matched sections by default
      setSelectedSectionIds(
        new Set(data.sections.map((s: SectionData) => s.id)),
      );

      setShowConfirmDialog(true);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
      toastManager.add({
        type: "error",
        title: tSubscriptions("bulkImport.fetchFailed"),
        description: tSubscriptions("bulkImport.tryLater"),
      });
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    try {
      const idsToAdd = Array.from(selectedSectionIds);
      if (idsToAdd.length === 0) {
        setShowConfirmDialog(false);
        return;
      }

      await addSectionsToSubscription(idsToAdd);
      await loadSubscriptions();

      // Reset state
      setImportText("");
      setMatchedSections([]);
      setSelectedSectionIds(new Set());
      setUnmatchedCodes([]);
      setShowConfirmDialog(false);

      toastManager.add({
        type: "success",
        title: tSubscriptions("bulkImport.subscribeSuccess", {
          count: idsToAdd.length,
        }),
      });
    } catch (error) {
      console.error("Failed to import sections:", error);
      toastManager.add({
        type: "error",
        title: tSubscriptions("bulkImport.fetchFailed"),
        description: tSubscriptions("bulkImport.tryLater"),
      });
    }
  };

  const toggleSectionSelection = (sectionId: number) => {
    setSelectedSectionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <main className="page-main">
        <p className="text-body text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="page-main">
      <PageHeader
        title={tSubscriptions("title")}
        subtitle={tSubscriptions("subtitle")}
        breadcrumbs={[
          { label: t("home"), href: "/" },
          { label: t("me"), href: "/me" },
          { label: t("sectionSubscriptions") },
        ]}
        actions={[
          <div key="stats" className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <span className="text-body font-medium">
              {tSubscriptions("stats", { count: sections.length })}
            </span>
          </div>,
        ]}
      />

      {/* Subscription Calendar URL */}
      {subscriptionUrl && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {tSubscriptions("calendarLink")}
            </CardTitle>
          </CardHeader>
          <div className="p-6 pt-0">
            <p className="text-small text-muted-foreground mb-4">
              {tSubscriptions("calendarLinkDescription")}
            </p>
            <div className="flex gap-2 items-center">
              <Input
                aria-label="Calendar subscription URL"
                disabled
                placeholder={subscriptionUrl}
                type="url"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                aria-label={tSubscriptions("buttons.copy")}
              >
                {copied ? (
                  <CheckIcon className="h-6 w-6" />
                ) : (
                  <CopyIcon className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Bulk Import Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {tSubscriptions("bulkImportTitle")}
          </CardTitle>
        </CardHeader>
        <div className="p-6 pt-0">
          <p className="text-small text-muted-foreground mb-4">
            {tSubscriptions("bulkImportDescription")}
          </p>
          <Textarea
            placeholder={tSubscriptions("placeholder")}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={4}
            className="mb-4"
          />
          <Button
            onClick={handleFetchSections}
            disabled={!importText.trim() || importing}
            className="w-full"
          >
            {importing
              ? tSubscriptions("matching")
              : tSubscriptions("matchButton")}
          </Button>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tSubscriptions("confirmTitle", {
                count: matchedSections.length,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {matchedSections.length > 0 && (
                <>
                  <p className="mb-4">
                    {tSubscriptions("foundMatched", {
                      count: matchedSections.length,
                    })}
                  </p>
                  <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
                    {matchedSections.map((section) => (
                      <button
                        type="button"
                        key={section.id}
                        className="w-full flex items-start gap-3 p-3 border rounded-md hover:bg-muted cursor-pointer text-left"
                        onClick={() => toggleSectionSelection(section.id)}
                      >
                        <Checkbox
                          checked={selectedSectionIds.has(section.id)}
                          onCheckedChange={() =>
                            toggleSectionSelection(section.id)
                          }
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {(() => {
                              localizeSection(section);
                              return (
                                section.course as Localized<
                                  typeof section.course
                                >
                              ).namePrimary;
                            })()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {section.code} ·{" "}
                            {
                              (
                                section.semester as
                                  | Localized<typeof section.semester>
                                  | undefined
                              )?.namePrimary
                            }{" "}
                            ·{" "}
                            {
                              (
                                section.campus as
                                  | Localized<typeof section.campus>
                                  | undefined
                              )?.namePrimary
                            }
                            {section.teachers.length > 0 &&
                              ` · ${section.teachers.map((t) => (t as Localized<typeof t>).namePrimary).join(", ")}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {unmatchedCodes.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {tSubscriptions("unmatched", {
                    count: unmatchedCodes.length,
                    codes: unmatchedCodes.join(", "),
                  })}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>
              {tSubscriptions("buttons.cancel")}
            </AlertDialogClose>
            <Button onClick={handleConfirmImport}>
              {tSubscriptions("subscribeButton", {
                count: selectedSectionIds.size,
              })}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      {/* Sections List */}
      {sections.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <Bell className="h-12 w-12" />
          </EmptyHeader>
          <EmptyTitle>{tSubscriptions("noSubscriptions")}</EmptyTitle>
          <p className="text-body text-muted-foreground mb-4">
            {tSubscriptions("browseHint")}
          </p>
          <Button render={<Link href="/sections" />}>
            {tSubscriptions("buttons.browseCourses")}
          </Button>
        </Empty>
      ) : (
        <div className="mb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tSubscriptions("table.courseName")}</TableHead>
                <TableHead>{tSubscriptions("table.sectionCode")}</TableHead>
                <TableHead>{tSubscriptions("table.semester")}</TableHead>
                <TableHead>{tSubscriptions("table.campus")}</TableHead>
                <TableHead>{tSubscriptions("table.teachers")}</TableHead>
                <TableHead>{tSubscriptions("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section) => {
                localizeSection(section);
                return (
                  <TableRow key={section.id}>
                    <TableCell>
                      <Link
                        href={`/sections/${section.jwId}`}
                        className="text-primary hover:underline"
                      >
                        {
                          (section.course as Localized<typeof section.course>)
                            .namePrimary
                        }
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {section.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {section.semester
                        ? (
                            section.semester as Localized<
                              typeof section.semester
                            >
                          ).namePrimary
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {section.campus
                        ? (section.campus as Localized<typeof section.campus>)
                            .namePrimary
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {section.teachers.length > 0
                        ? section.teachers
                            .map((t) => (t as Localized<typeof t>).namePrimary)
                            .join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              aria-label={tSubscriptions("unsubscribeLabel")}
                              size="sm"
                            />
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </AlertDialogTrigger>
                        <AlertDialogPopup>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {tSubscriptions("unsubscribeConfirm")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {tSubscriptions("unsubscribeDescription", {
                                course: (
                                  section.course as Localized<
                                    typeof section.course
                                  >
                                ).namePrimary,
                                code: section.code,
                              })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogClose
                              render={<Button variant="ghost" />}
                            >
                              {tSubscriptions("buttons.cancel")}
                            </AlertDialogClose>
                            <AlertDialogClose
                              render={
                                <Button
                                  variant="destructive"
                                  onClick={() => handleUnsubscribe(section.id)}
                                />
                              }
                            >
                              {tSubscriptions("unsubscribeButton")}
                            </AlertDialogClose>
                          </AlertDialogFooter>
                        </AlertDialogPopup>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
