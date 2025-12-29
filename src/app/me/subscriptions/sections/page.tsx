"use client";

import { Bell, Calendar, Copy, Trash2 } from "lucide-react";
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
import { Link } from "@/i18n/routing";
import {
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
                <Copy className="h-6 w-6" />
                {copied ? "✓" : ""}
              </Button>
            </div>
          </div>
        </Card>
      )}

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
