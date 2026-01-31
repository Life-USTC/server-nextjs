"use client";

import type { Campus, Course, Semester, Teacher } from "@prisma/client";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { addSectionsToSubscription } from "@/app/actions/subscription";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";

type SectionData = {
  id: number;
  code: string;
  course: Course & {
    namePrimary?: string;
    nameSecondary?: string | null;
  };
  semester: (Semester & { namePrimary?: string }) | null;
  campus:
    | (Campus & {
        namePrimary?: string;
      })
    | null;
  teachers: Array<
    Teacher & {
      namePrimary?: string;
    }
  >;
};

type SemesterOption = Pick<Semester, "id" | "nameCn"> & {
  namePrimary?: string;
};

interface BulkImportSectionsProps {
  semesters: SemesterOption[];
  defaultSemesterId?: number | null;
}

export function BulkImportSections({
  semesters,
  defaultSemesterId,
}: BulkImportSectionsProps) {
  const t = useTranslations("subscriptions");
  const locale = useLocale();
  const router = useRouter();

  // Bulk import state
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [matchedSections, setMatchedSections] = useState<SectionData[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<number>>(
    new Set(),
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [unmatchedCodes, setUnmatchedCodes] = useState<string[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(
    defaultSemesterId ? defaultSemesterId.toString() : "",
  );

  const getNamePrimary = (item: {
    namePrimary?: string;
    nameCn?: string | null;
    nameEn?: string | null;
  }) => {
    if (item.namePrimary) return item.namePrimary;
    const english = item.nameEn?.trim();
    if (locale === "en-us" && english) return english;
    return item.nameCn ?? "";
  };

  const getNameSecondary = (item: {
    nameSecondary?: string | null;
    nameCn?: string | null;
    nameEn?: string | null;
  }) => {
    if (item.nameSecondary !== undefined) return item.nameSecondary;
    const english = item.nameEn?.trim();
    if (locale === "en-us") {
      return english ? (item.nameCn ?? null) : null;
    }
    return english ?? null;
  };

  const semesterItems = semesters.map((semester) => ({
    label: getNamePrimary(semester),
    value: semester.id.toString(),
  }));

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
          title: t("bulkImport.noValidCodes"),
          description: t("bulkImport.checkFormat"),
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
        body: JSON.stringify({
          codes: uniqueCodes,
          semesterId: selectedSemesterId || undefined,
        }),
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
        title: t("bulkImport.fetchFailed"),
        description: t("bulkImport.pleaseRetry"),
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

      // Reset state
      setImportText("");
      setMatchedSections([]);
      setSelectedSectionIds(new Set());
      setUnmatchedCodes([]);
      setShowConfirmDialog(false);

      toastManager.add({
        type: "success",
        title: t("bulkImport.success"),
        description: t("bulkImport.successDescription", {
          count: idsToAdd.length,
        }),
      });

      // Refresh the page to show updated subscriptions
      router.refresh();
    } catch (error) {
      console.error("Failed to import sections:", error);
      toastManager.add({
        type: "error",
        title: t("bulkImport.importFailed"),
        description: t("bulkImport.pleaseRetry"),
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

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("bulkImport.title")}
          </CardTitle>
        </CardHeader>
        <div className="p-6 pt-0">
          <p className="text-small text-muted-foreground mb-4">
            {t("bulkImport.description")}
          </p>
          <Field className="mb-4">
            <FieldLabel>{t("bulkImport.semesterLabel")}</FieldLabel>
            <Select
              name="semesterId"
              value={selectedSemesterId}
              onValueChange={(value) => setSelectedSemesterId(value ?? "")}
              items={semesterItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t("bulkImport.semesterPlaceholder")}
                />
              </SelectTrigger>
              <SelectPopup>
                {semesterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>
          <Textarea
            placeholder={t("bulkImport.placeholder")}
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
            {importing ? t("bulkImport.matching") : t("bulkImport.matchButton")}
          </Button>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("bulkImport.confirmTitle", { count: matchedSections.length })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {matchedSections.length > 0 && (
                <>
                  <p className="mb-4">
                    {t("bulkImport.foundSections", {
                      count: matchedSections.length,
                    })}
                  </p>
                  <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
                    {matchedSections.map((section) => (
                      <Button
                        type="button"
                        key={section.id}
                        variant="outline"
                        className="w-full h-auto items-start justify-start gap-3 p-3 text-left"
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
                            {getNamePrimary(section.course)}
                            {getNameSecondary(section.course) && (
                              <span className="ml-2 text-muted-foreground">
                                ({getNameSecondary(section.course)})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {section.code} ·
                            {section.semester
                              ? getNamePrimary(section.semester)
                              : "—"}
                            {section.campus
                              ? ` · ${getNamePrimary(section.campus)}`
                              : ""}
                            {section.teachers.length > 0
                              ? ` · ${section.teachers
                                  .map((teacher) => getNamePrimary(teacher))
                                  .filter(Boolean)
                                  .join(", ")}`
                              : ""}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </>
              )}
              {unmatchedCodes.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("bulkImport.unmatchedCodes", {
                    count: unmatchedCodes.length,
                  })}
                  : {unmatchedCodes.join(", ")}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>
              {t("bulkImport.cancel")}
            </AlertDialogClose>
            <Button onClick={handleConfirmImport}>
              {t("bulkImport.subscribeSelected", {
                count: selectedSectionIds.size,
              })}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
