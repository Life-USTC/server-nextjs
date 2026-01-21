import dayjs from "dayjs";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SubscriptionCalendarButton } from "@/components/subscription-calendar-button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ViewSwitcher } from "@/components/view-switcher";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { formatTime } from "@/lib/time-utils";

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const searchP = await searchParams;
  const view = searchP.view || "table";
  const locale = await getLocale();

  const section = await prisma.section.findUnique({
    where: { jwId: parseInt(id, 10) },
    include: {
      course: true,
      semester: true,
      campus: true,
      openDepartment: true,
      examMode: true,
      teachLanguage: true,
      roomType: true,
      adminClasses: true,
      teachers: {
        include: {
          department: true,
        },
      },
      schedules: {
        include: {
          room: {
            include: {
              building: {
                include: {
                  campus: true,
                },
              },
            },
          },
          teachers: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      },
      exams: {
        include: {
          examBatch: true,
          examRooms: true,
        },
        orderBy: { examDate: "asc" },
      },
    },
  });

  if (!section) {
    notFound();
  }

  // Fetch other sections of the same course (include teachers for grouping)
  const otherSections = await prisma.section.findMany({
    where: {
      courseId: section.courseId,
      id: { not: section.id },
    },
    include: {
      semester: true,
      teachers: true,
    },
    orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
  });

  // Get current section's teacher IDs for comparison
  const currentTeacherIds = new Set(section.teachers.map((t) => t.id));
  const currentSemesterId = section.semesterId;

  // Group other sections
  const sameSemesterOtherTeachers = otherSections.filter((s) => {
    if (s.semesterId !== currentSemesterId) return false;
    // Check if teachers are different (no overlap)
    const sectionTeacherIds = s.teachers.map((t) => t.id);
    const hasOverlap = sectionTeacherIds.some((id) =>
      currentTeacherIds.has(id),
    );
    return !hasOverlap;
  });

  const sameTeacherOtherSemesters = otherSections.filter((s) => {
    if (s.semesterId === currentSemesterId) return false;
    // Check if at least one teacher overlaps
    const sectionTeacherIds = s.teachers.map((t) => t.id);
    return sectionTeacherIds.some((id) => currentTeacherIds.has(id));
  });

  const t = await getTranslations("sectionDetail");
  const tCommon = await getTranslations("common");
  const tA11y = await getTranslations("accessibility");
  const isEnglish = locale === "en-us";

  const formatWeekday = (weekday: number) => {
    const weekdays = [
      t("weekdays.sunday"),
      t("weekdays.monday"),
      t("weekdays.tuesday"),
      t("weekdays.wednesday"),
      t("weekdays.thursday"),
      t("weekdays.friday"),
      t("weekdays.saturday"),
    ];
    return weekdays[weekday] || `Day ${weekday}`;
  };

  return (
    <main className="page-main">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              {tCommon("home")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/sections" />}>
              {tCommon("sections")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{section.code}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8 mt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-display mb-2">
              {isEnglish && section.course.nameEn
                ? section.course.nameEn
                : section.course.nameCn}
            </h1>
            {isEnglish
              ? section.course.nameCn && (
                  <p className="text-subtitle text-muted-foreground">
                    {section.course.nameCn}
                  </p>
                )
              : section.course.nameEn && (
                  <p className="text-subtitle text-muted-foreground">
                    {section.course.nameEn}
                  </p>
                )}
          </div>
          <SubscriptionCalendarButton
            sectionDatabaseId={section.id}
            addToCalendarLabel={t("addToCalendar")}
            sheetTitle={t("calendarSheetTitle")}
            sheetDescription={t("calendarSheetDescription")}
            calendarUrlLabel={t("calendarUrlLabel")}
            subscriptionUrlLabel={t("subscriptionUrlLabel")}
            subscriptionHintLabel={t("subscriptionHintLabel")}
            subscribeLabel={t("subscribeLabel")}
            unsubscribeLabel={t("unsubscribeLabel")}
            copyLabel={t("copyToClipboard")}
            closeLabel={t("close")}
            learnMoreLabel={t("learnMoreAboutICalendar")}
            copiedLabel={t("copied")}
            subscribingLabel={t("subscribing")}
            unsubscribingLabel={t("unsubscribing")}
            pleaseWaitLabel={t("pleaseWait")}
            subscribeSuccessLabel={t("subscribeSuccess")}
            unsubscribeSuccessLabel={t("unsubscribeSuccess")}
            subscribeSuccessDescriptionLabel={t("subscribeSuccessDescription")}
            unsubscribeSuccessDescriptionLabel={t(
              "unsubscribeSuccessDescription",
            )}
            operationFailedLabel={t("operationFailed")}
            pleaseRetryLabel={t("pleaseRetry")}
            viewAllSubscriptionsLabel={t("viewAllSubscriptions")}
            loginRequiredLabel={t("loginRequired")}
            loginRequiredDescriptionLabel={t("loginRequiredDescription")}
            loginToSubscribeLabel={t("loginToSubscribe")}
            subscriptionCalendarUrlAriaLabel={tA11y("subscriptionCalendarUrl")}
            singleSectionCalendarUrlAriaLabel={tA11y(
              "singleSectionCalendarUrl",
            )}
          />
        </div>
      </div>

      {/* Basic Info Card */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardPanel>
          {(section.semester || section.campus || section.code) && (
            <div className="grid grid-cols-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {section.semester && (
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">{t("semester")}</span>
                  <span className="font-medium text-foreground">
                    {section.semester.nameCn}
                  </span>
                </div>
              )}
              {section.code && (
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">
                    {t("sectionCode")}
                  </span>
                  <span className="font-medium text-foreground font-mono">
                    {section.code}
                  </span>
                </div>
              )}
              {section.campus && (
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">{t("campus")}</span>
                  <span className="font-medium text-foreground">
                    {section.campus.nameCn}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {section.graduateAndPostgraduate && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">
                  {tCommon("graduate")}
                </span>
                <span className="font-medium text-foreground">
                  {tCommon("graduate")}
                </span>
              </div>
            )}
            {section.credits !== null && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{t("credits")}</span>
                <span className="font-medium text-foreground">
                  {section.credits}
                </span>
              </div>
            )}
            {section.period !== null && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{t("period")}</span>
                <span className="font-medium text-foreground">
                  {section.period}
                  {section.actualPeriods !== null &&
                    section.actualPeriods !== section.period &&
                    ` (${section.actualPeriods})`}
                </span>
              </div>
            )}
            {section.examMode && (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">{t("examMode")}</span>
                <span className="font-medium text-foreground">
                  {section.examMode.nameCn}
                </span>
              </div>
            )}
          </div>

          {/* Remarks Row */}
          {section.remark && (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-1">
                {t("remark")}
              </p>
              <p className="text-body text-foreground whitespace-pre-wrap">
                {section.remark}
              </p>
            </div>
          )}

          {/* Teachers Row */}
          {section.teachers && section.teachers.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-2">
                {t("teachers")}
              </p>
              <div className="flex flex-wrap gap-2">
                {section.teachers.map((teacher) => (
                  <Link
                    key={teacher.id}
                    href={`/teachers/${teacher.id}`}
                    className="no-underline"
                  >
                    <Badge
                      variant="secondary"
                      className="hover:bg-secondary/80 cursor-pointer"
                    >
                      {teacher.nameCn}
                      {teacher.department && (
                        <span className="text-muted-foreground ml-1">
                          ({teacher.department.nameCn})
                        </span>
                      )}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible More Details Section */}
          <Collapsible className="mt-4">
            <CollapsibleTrigger className="flex items-center text-sm text-muted-foreground hover:underline">
              {t("moreDetails")} ↓
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="grid grid-cols-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {section.teachLanguage && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground">
                      {t("teachLanguage")}
                    </span>
                    <span className="font-medium text-foreground">
                      {section.teachLanguage.nameCn}
                    </span>
                  </div>
                )}
                {section.roomType && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground">
                      {t("roomType")}
                    </span>
                    <span className="font-medium text-foreground">
                      {section.roomType.nameCn}
                    </span>
                  </div>
                )}
                {section.timesPerWeek !== null && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground">
                      {t("timesPerWeek")}
                    </span>
                    <span className="font-medium text-foreground">
                      {section.timesPerWeek}
                    </span>
                  </div>
                )}
              </div>

              {/* Detailed Periods Row */}
              {(section.theoryPeriods ||
                section.practicePeriods ||
                section.experimentPeriods ||
                section.machinePeriods ||
                section.designPeriods ||
                section.testPeriods) && (
                <div className="">
                  <div className="grid grid-cols-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {section.periodsPerWeek ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("periodsPerWeek")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.periodsPerWeek}
                        </span>
                      </div>
                    ) : null}
                    {section.theoryPeriods ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("theoryPeriods")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.theoryPeriods}
                        </span>
                      </div>
                    ) : null}
                    {section.practicePeriods ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("practicePeriods")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.practicePeriods}
                        </span>
                      </div>
                    ) : null}
                    {section.experimentPeriods ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("experimentPeriods")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.experimentPeriods}
                        </span>
                      </div>
                    ) : null}
                    {section.machinePeriods ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("machinePeriods")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.machinePeriods}
                        </span>
                      </div>
                    ) : null}
                    {section.designPeriods ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("designPeriods")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.designPeriods}
                        </span>
                      </div>
                    ) : null}
                    {section.testPeriods ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("testPeriods")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.testPeriods}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Admin Classes Row */}
              {section.adminClasses && section.adminClasses.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("adminClasses")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {section.adminClasses.map((ac) => (
                      <Badge key={ac.id} variant="secondary">
                        {ac.nameCn}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Sections */}
              {(sameSemesterOtherTeachers.length > 0 ||
                sameTeacherOtherSemesters.length > 0 ||
                otherSections.length > 0) && (
                <div className="mt-6 space-y-4">
                  {/* Same Semester, Other Teachers Row */}
                  {sameSemesterOtherTeachers.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t("sameSemesterOtherTeachers")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {sameSemesterOtherTeachers
                          .slice(0, 10)
                          .map((otherSection) => (
                            <Link
                              key={otherSection.id}
                              href={`/sections/${otherSection.jwId}`}
                              className="no-underline"
                            >
                              <Badge
                                variant="outline"
                                className="hover:bg-accent cursor-pointer"
                              >
                                {otherSection.teachers.length > 0 ? (
                                  <span>
                                    {otherSection.teachers
                                      .map((t) => t.nameCn)
                                      .join(", ")}
                                  </span>
                                ) : (
                                  <span>{t("noTeacher")}</span>
                                )}
                                <span className="text-muted-foreground ml-1">
                                  {otherSection.code}
                                </span>
                              </Badge>
                            </Link>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Same Teacher, Other Semesters Row */}
                  {sameTeacherOtherSemesters.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t("sameTeacherOtherSemesters")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {sameTeacherOtherSemesters
                          .slice(0, 10)
                          .map((otherSection) => (
                            <Link
                              key={otherSection.id}
                              href={`/sections/${otherSection.jwId}`}
                              className="no-underline"
                            >
                              <Badge
                                variant="outline"
                                className="hover:bg-accent cursor-pointer"
                              >
                                {otherSection.semester && (
                                  <span>{otherSection.semester.nameCn}</span>
                                )}
                                <span className="text-muted-foreground ml-1">
                                  {otherSection.code}
                                </span>
                              </Badge>
                            </Link>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* View All Sections Button */}
                  {otherSections.length > 0 && (
                    <div>
                      <Link
                        href={`/courses/${section.course.jwId}`}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        {t("viewAllCourseSections")} ({otherSections.length + 1}
                        ) →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardPanel>
      </Card>

      {section.exams && section.exams.length > 0 && (
        <div className="mb-8">
          <h2 className="text-title-2 mb-4">
            {t("exams", { count: section.exams.length })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.exams.map((exam) => (
              <Card key={exam.id}>
                <CardHeader>
                  <CardTitle>
                    {exam.examDate
                      ? dayjs(exam.examDate).format("YYYY.MM.DD")
                      : t("examDateTBD")}
                  </CardTitle>
                  {exam.examBatch && (
                    <p className="text-small text-muted-foreground">
                      {exam.examBatch.nameCn}
                    </p>
                  )}
                </CardHeader>
                <CardPanel>
                  <div className="grid grid-cols-1 text-sm sm:grid-cols-2">
                    {exam.examMode && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("examMode")}
                        </span>
                        <span className="font-medium text-foreground">
                          {exam.examMode}
                        </span>
                      </div>
                    )}
                    {exam.startTime !== null && exam.endTime !== null && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("time")}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatTime(exam.startTime)} -{" "}
                          {formatTime(exam.endTime)}
                        </span>
                      </div>
                    )}
                    {exam.examRooms && exam.examRooms.length > 0 && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("location")}
                        </span>
                        <span className="font-medium text-foreground">
                          {exam.examRooms
                            .map((er) => er.room)
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    {exam.examTakeCount !== null && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("examCount")}
                        </span>
                        <span className="font-medium text-foreground">
                          {exam.examTakeCount}
                        </span>
                      </div>
                    )}
                  </div>
                </CardPanel>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-title-2">
            {t("schedule", { count: section.schedules.length })}
          </h2>
          <ViewSwitcher />
        </div>
        {section.schedules.length > 0 ? (
          view === "table" ? (
            <div className="mb-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("weekday")}</TableHead>
                    <TableHead>{t("time")}</TableHead>
                    <TableHead>{t("units")}</TableHead>
                    <TableHead>{t("week")}</TableHead>
                    <TableHead>{t("location")}</TableHead>
                    <TableHead>{t("teacher")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        {dayjs(schedule.date).format("YYYY.MM.DD")}
                      </TableCell>
                      <TableCell>
                        {formatWeekday(dayjs(schedule.date).day())}
                      </TableCell>
                      <TableCell>
                        {formatTime(schedule.startTime)} -{" "}
                        {formatTime(schedule.endTime)}
                      </TableCell>
                      <TableCell>
                        {schedule.startUnit} - {schedule.endUnit}
                      </TableCell>
                      <TableCell>{schedule.weekIndex || "—"}</TableCell>
                      <TableCell>
                        {schedule.customPlace
                          ? schedule.customPlace
                          : schedule.room
                            ? `${schedule.room.nameCn}${
                                schedule.room.building
                                  ? ` · ${schedule.room.building.nameCn}`
                                  : ""
                              }${
                                schedule.room.building?.campus
                                  ? ` · ${schedule.room.building.campus.nameCn}`
                                  : ""
                              }`
                            : "—"}
                      </TableCell>
                      <TableCell>
                        {schedule.teachers && schedule.teachers.length > 0
                          ? schedule.teachers.map((t) => t.nameCn).join(", ")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.schedules.map((schedule) => (
                <Card key={schedule.id}>
                  <CardHeader>
                    <CardTitle>
                      {dayjs(schedule.date).format("YYYY.MM.DD")}
                    </CardTitle>
                    <p className="text-small text-muted-foreground">
                      {formatWeekday(dayjs(schedule.date).day())}
                    </p>
                  </CardHeader>
                  <CardPanel>
                    <div className="flex flex-col gap-3">
                      <p className="text-body text-foreground">
                        <strong>{t("time")}:</strong>{" "}
                        {formatTime(schedule.startTime)} -{" "}
                        {formatTime(schedule.endTime)}
                      </p>
                      <p className="text-body text-foreground">
                        <strong>{t("units")}:</strong> {schedule.startUnit} -{" "}
                        {schedule.endUnit}
                      </p>
                      {schedule.weekIndex && (
                        <p className="text-body text-foreground">
                          <strong>{t("week")}:</strong> {schedule.weekIndex}
                        </p>
                      )}
                      {schedule.customPlace ? (
                        <p className="text-body text-foreground">
                          <strong>{t("location")}:</strong>{" "}
                          {schedule.customPlace}
                        </p>
                      ) : (
                        schedule.room && (
                          <p className="text-body text-foreground">
                            <strong>{t("location")}:</strong>{" "}
                            {schedule.room.nameCn}
                            {schedule.room.building && (
                              <span className="text-muted-foreground">
                                {" "}
                                · {schedule.room.building.nameCn}
                                {schedule.room.building.campus &&
                                  ` · ${schedule.room.building.campus.nameCn}`}
                              </span>
                            )}
                          </p>
                        )
                      )}
                      {schedule.teachers && schedule.teachers.length > 0 && (
                        <p className="text-body text-foreground">
                          <strong>{t("teacher")}:</strong>{" "}
                          {schedule.teachers.map((t) => t.nameCn).join(", ")}
                        </p>
                      )}
                    </div>
                  </CardPanel>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("noSchedule")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </main>
  );
}
