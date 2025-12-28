import dayjs from "dayjs";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarButton } from "@/components/calendar-button";
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
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();

  const section = await prisma.section.findUnique({
    where: { jwId: parseInt(id, 10) },
    include: {
      course: true,
      semester: true,
      campus: true,
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
          teacher: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!section) {
    notFound();
  }

  const t = await getTranslations("sectionDetail");
  const tCommon = await getTranslations("common");
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
          <CalendarButton
            sectionId={section.jwId}
            addToCalendarLabel={t("addToCalendar")}
            sheetTitle={t("calendarSheetTitle")}
            sheetDescription={t("calendarSheetDescription")}
            calendarUrlLabel={t("calendarUrlLabel")}
            copyLabel={t("copyToClipboard")}
            closeLabel={t("close")}
            learnMoreLabel={t("learnMoreAboutICalendar")}
          />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {section.semester && (
          <Badge variant="outline">{section.semester.nameCn}</Badge>
        )}
        <Badge variant="outline" className="font-mono">
          {section.code}
        </Badge>
        {section.campus && (
          <Badge variant="outline">{section.campus.nameCn}</Badge>
        )}
        <Badge variant="outline">
          {section.stdCount ?? 0} / {section.limitCount ?? "—"}
        </Badge>
      </div>

      <div className="mb-8">
        <Link
          href={`/courses/${section.course.jwId}`}
          className="text-body text-primary hover:underline"
        >
          {t("viewAllSections")} →
        </Link>
      </div>

      {section.teachers && section.teachers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-title-2 mb-2">{t("teachers")}</h2>
          <ul className="list-disc list-inside text-body text-foreground space-y-2">
            {section.teachers.map((teacher) => (
              <li key={teacher.id}>
                <div className="inline">
                  {teacher.nameCn}
                  {teacher.department && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({teacher.department.nameCn})
                    </span>
                  )}
                  <span className="ml-2">
                    <Link
                      href={`/sections?search=teacher:${encodeURIComponent(teacher.nameCn)}`}
                      className="text-small text-primary hover:underline"
                    >
                      {t("viewTeacherCourses", { teacher: teacher.nameCn })} →
                    </Link>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-title-2 mb-4">
          {t("schedule", { count: section.schedules.length })}
        </h2>
        {section.schedules.length > 0 ? (
          <div className="space-y-4">
            {section.schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <CardTitle>
                    {dayjs(schedule.date).format("MMMM D, YYYY")}
                  </CardTitle>
                  <p className="text-small text-muted-foreground">
                    {formatWeekday(dayjs(schedule.date).day())}
                  </p>
                </CardHeader>
                <CardPanel>
                  <div className="flex flex-col gap-3">
                    <p className="text-body text-foreground">
                      <strong>{t("time")}:</strong> {schedule.startTime} -{" "}
                      {schedule.endTime}
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
                        <strong>{t("location")}:</strong> {schedule.customPlace}
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
                    {schedule.teacher && (
                      <p className="text-body text-foreground">
                        <strong>{t("teacher")}:</strong>{" "}
                        {schedule.teacher.nameCn}
                      </p>
                    )}
                  </div>
                </CardPanel>
              </Card>
            ))}
          </div>
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
