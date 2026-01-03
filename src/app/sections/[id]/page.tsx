import dayjs from "dayjs";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { SubscriptionCalendarButton } from "@/components/subscription-calendar-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
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
import { addLocalizedNames, type Localized } from "@/lib/localization-helpers";
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

  const t = await getTranslations("sectionDetail");
  const tCommon = await getTranslations("common");

  addLocalizedNames(section.course, locale);
  if (section.campus) addLocalizedNames(section.campus, locale);
  section.teachers.forEach((teacher) => {
    addLocalizedNames(teacher, locale);
    if (teacher.department) addLocalizedNames(teacher.department, locale);
  });
  section.exams.forEach((exam) => {
    if (exam.examBatch) addLocalizedNames(exam.examBatch, locale);
  });
  section.schedules.forEach((schedule) => {
    if (schedule.room) {
      addLocalizedNames(schedule.room, locale);
      if (schedule.room.building) {
        addLocalizedNames(schedule.room.building, locale);
        if (schedule.room.building.campus) {
          addLocalizedNames(schedule.room.building.campus, locale);
        }
      }
    }
    schedule.teachers.forEach((t) => {
      addLocalizedNames(t, locale);
    });
  });

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

  const courseName = (section.course as Localized<typeof section.course>)
    .namePrimary;
  const courseSubtitle = (section.course as Localized<typeof section.course>)
    .nameSecondary;

  const breadcrumbs = [
    { label: tCommon("home"), href: "/" },
    { label: tCommon("sections"), href: "/sections" },
    { label: section.code },
  ];

  return (
    <main className="page-main">
      <PageHeader
        title={courseName}
        subtitle={courseSubtitle || undefined}
        breadcrumbs={breadcrumbs}
        actions={[
          <SubscriptionCalendarButton
            key="calendar-button"
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
          />,
        ]}
      />

      <div className="mb-8 flex flex-wrap gap-2">
        {section.semester && (
          <Badge variant="outline">{section.semester.nameCn}</Badge>
        )}
        <Badge variant="outline" className="font-mono">
          {section.code}
        </Badge>
        {section.campus && (
          <Badge variant="outline">
            {(section.campus as Localized<typeof section.campus>).namePrimary}
          </Badge>
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
                  {(teacher as Localized<typeof teacher>).namePrimary}
                  {teacher.department && (
                    <span className="text-muted-foreground">
                      {" "}
                      (
                      {
                        (
                          teacher.department as Localized<
                            typeof teacher.department
                          >
                        ).namePrimary
                      }
                      )
                    </span>
                  )}
                  <span className="ml-2">
                    <Link
                      href={`/sections?search=teacher:${encodeURIComponent(teacher.nameCn)}`}
                      className="text-small text-primary hover:underline"
                    >
                      {t("viewTeacherCourses", {
                        teacher: (teacher as Localized<typeof teacher>)
                          .namePrimary,
                      })}{" "}
                      →
                    </Link>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                      {
                        (exam.examBatch as Localized<typeof exam.examBatch>)
                          .namePrimary
                      }
                    </p>
                  )}
                </CardHeader>
                <CardPanel>
                  <div className="flex flex-col gap-3">
                    {exam.examMode && (
                      <p className="text-body text-foreground">
                        <strong>{t("examMode")}:</strong> {exam.examMode}
                      </p>
                    )}
                    {exam.startTime !== null && exam.endTime !== null && (
                      <p className="text-body text-foreground">
                        <strong>{t("time")}:</strong>{" "}
                        {formatTime(exam.startTime)} -{" "}
                        {formatTime(exam.endTime)}
                      </p>
                    )}
                    {exam.examRooms && exam.examRooms.length > 0 && (
                      <p className="text-body text-foreground">
                        <strong>{t("location")}:</strong>{" "}
                        {exam.examRooms
                          .map((er) => er.room)
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {exam.examTakeCount !== null && (
                      <p className="text-body text-foreground">
                        <strong>{t("examCount")}:</strong> {exam.examTakeCount}
                      </p>
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
                            ? `${(schedule.room as Localized<typeof schedule.room>).namePrimary}${
                                schedule.room.building
                                  ? ` · ${(schedule.room.building as Localized<typeof schedule.room.building>).namePrimary}`
                                  : ""
                              }${
                                schedule.room.building?.campus
                                  ? ` · ${(schedule.room.building.campus as Localized<typeof schedule.room.building.campus>).namePrimary}`
                                  : ""
                              }`
                            : "—"}
                      </TableCell>
                      <TableCell>
                        {schedule.teachers && schedule.teachers.length > 0
                          ? schedule.teachers
                              .map(
                                (t) => (t as Localized<typeof t>).namePrimary,
                              )
                              .join(", ")
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
                            {
                              (schedule.room as Localized<typeof schedule.room>)
                                .namePrimary
                            }
                            {schedule.room.building && (
                              <span className="text-muted-foreground">
                                {" "}
                                ·{" "}
                                {
                                  (
                                    schedule.room.building as Localized<
                                      typeof schedule.room.building
                                    >
                                  ).namePrimary
                                }
                                {schedule.room.building.campus &&
                                  ` · ${(schedule.room.building.campus as Localized<typeof schedule.room.building.campus>).namePrimary}`}
                              </span>
                            )}
                          </p>
                        )
                      )}
                      {schedule.teachers && schedule.teachers.length > 0 && (
                        <p className="text-body text-foreground">
                          <strong>{t("teacher")}:</strong>{" "}
                          {schedule.teachers
                            .map((t) => (t as Localized<typeof t>).namePrimary)
                            .join(", ")}
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
