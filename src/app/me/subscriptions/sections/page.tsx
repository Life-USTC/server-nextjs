"use client";

import {
  Bell,
  Calendar,
  CheckIcon,
  CopyIcon,
  Download,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
          title: "未找到有效的班级代码",
          description: "请检查输入的文本格式",
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
        title: "获取课程信息失败",
        description: "请稍后重试",
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
        title: "订阅成功",
        description: `已成功订阅 ${idsToAdd.length} 个班级`,
      });
    } catch (error) {
      console.error("Failed to import sections:", error);
      toastManager.add({
        type: "error",
        title: "订阅失败",
        description: "请稍后重试",
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
        <p className="text-body text-muted-foreground">加载中...</p>
      </main>
    );
  }

  return (
    <main className="page-main">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              {t("home")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/me" />}>
              {t("me")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t("sectionSubscriptions")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-display mb-2">我的课程订阅</h1>
            <p className="text-subtitle text-muted-foreground">
              管理您订阅的所有课程班级
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <span className="text-body font-medium">
              {sections.length} 个班级
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Calendar URL */}
      {subscriptionUrl && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              日历订阅链接
            </CardTitle>
          </CardHeader>
          <div className="p-6 pt-0">
            <p className="text-small text-muted-foreground mb-4">
              复制此链接，在您的日历应用中订阅以自动同步所有课程
            </p>
            <div className="flex gap-2 items-center">
              <Input
                aria-label="Calendar subscription URL"
                disabled
                placeholder={subscriptionUrl}
                type="url"
              />
              <Button onClick={handleCopy} variant="outline" aria-label="复制">
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
            批量导入班级
          </CardTitle>
        </CardHeader>
        <div className="p-6 pt-0">
          <p className="text-small text-muted-foreground mb-4">
            粘贴包含班级代码的文本（如课表截图文字、选课清单等），系统会自动识别并匹配当前学期的课程
          </p>
          <Textarea
            placeholder="粘贴任意包含班级代码的文本，例如：001013.01, COMP3001.01 等"
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
            {importing ? "正在匹配..." : "识别并匹配课程"}
          </Button>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认订阅 {matchedSections.length} 个班级
            </AlertDialogTitle>
            <AlertDialogDescription>
              {matchedSections.length > 0 && (
                <>
                  <p className="mb-4">
                    找到 {matchedSections.length}{" "}
                    个匹配的班级，请选择要订阅的课程：
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
                            {section.course.nameCn}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {section.code} · {section.semester?.nameCn} ·{" "}
                            {section.campus?.nameCn}
                            {section.teachers.length > 0 &&
                              ` · ${section.teachers.map((t) => t.nameCn).join(", ")}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {unmatchedCodes.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  未匹配到的代码 ({unmatchedCodes.length}):{" "}
                  {unmatchedCodes.join(", ")}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>
              取消
            </AlertDialogClose>
            <Button onClick={handleConfirmImport}>
              订阅选中的 {selectedSectionIds.size} 个班级
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
          <EmptyTitle>暂无订阅</EmptyTitle>
          <p className="text-body text-muted-foreground mb-4">
            浏览课程并点击铃铛图标开始订阅
          </p>
          <Button render={<Link href="/sections" />}>浏览课程</Button>
        </Empty>
      ) : (
        <div className="mb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>课程名称</TableHead>
                <TableHead>班级代码</TableHead>
                <TableHead>学期</TableHead>
                <TableHead>校区</TableHead>
                <TableHead>教师</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section) => (
                <TableRow key={section.id}>
                  <TableCell>
                    <Link
                      href={`/sections/${section.jwId}`}
                      className="text-primary hover:underline"
                    >
                      {section.course.nameCn}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {section.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {section.semester ? section.semester.nameCn : "—"}
                  </TableCell>
                  <TableCell>
                    {section.campus ? section.campus.nameCn : "—"}
                  </TableCell>
                  <TableCell>
                    {section.teachers.length > 0
                      ? section.teachers.map((t) => t.nameCn).join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            aria-label="取消订阅"
                            size="sm"
                          />
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </AlertDialogTrigger>
                      <AlertDialogPopup>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认取消订阅？</AlertDialogTitle>
                          <AlertDialogDescription>
                            您确定要取消订阅
                            <strong> {section.course.nameCn} </strong>(
                            {section.code})
                            吗？此操作将从您的日历订阅中移除该课程。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogClose render={<Button variant="ghost" />}>
                            取消
                          </AlertDialogClose>
                          <AlertDialogClose
                            render={
                              <Button
                                variant="destructive"
                                onClick={() => handleUnsubscribe(section.id)}
                              />
                            }
                          >
                            取消订阅
                          </AlertDialogClose>
                        </AlertDialogFooter>
                      </AlertDialogPopup>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
