import dayjs from "dayjs";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/breadcrumb";
import { prisma } from "@/lib/prisma";

async function getSectionData(sectionId: number) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      course: true,
      semester: true,
      campus: true,
      teachers: {
        include: {
          department: true,
        },
      },
    },
  });

  if (!section) {
    return null;
  }

  const schedules = await prisma.schedule.findMany({
    where: { sectionId },
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
  });

  return {
    section,
    schedules,
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const data = await getSectionData(Number(id));

  if (!data) {
    notFound();
  }

  const { section, schedules } = data;

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

  const breadcrumbItems = [
    { label: tCommon("home"), href: "/" },
    { label: tCommon("sections"), href: "/sections" },
    { label: section.code },
  ];

  return (
    <main className="page-main">
      <Breadcrumb items={breadcrumbItems} />
      <h1 className="text-display mb-2">
        {isEnglish && section.course.nameEn
          ? section.course.nameEn
          : section.course.nameCn}
      </h1>
      {isEnglish
        ? section.course.nameCn && (
            <p className="text-subtitle text-muted mb-4">
              {section.course.nameCn}
            </p>
          )
        : section.course.nameEn && (
            <p className="text-subtitle text-muted mb-4">
              {section.course.nameEn}
            </p>
          )}
      <div className="flex flex-wrap gap-2 mb-4">
        {section.semester && (
          <span className="text-tag tag-base tag-semester">
            {section.semester.name}
          </span>
        )}
        <span className="text-tag tag-base tag-section-code">
          {section.code}
        </span>
        {section.campus && (
          <span className="text-tag tag-base tag-campus">
            {section.campus.nameCn}
          </span>
        )}
        <span className="text-tag tag-base tag-capacity">
          {section.stdCount ?? 0} / {section.limitCount ?? "—"}
        </span>
      </div>

      {section.teachers && section.teachers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-title-2 mb-2">{t("teachers")}</h2>
          <ul className="list-disc list-inside text-body text-muted-strong">
            {section.teachers.map((teacher) => (
              <li key={teacher.id}>
                {teacher.nameCn}
                {teacher.department && (
                  <span className="text-muted">
                    {" "}
                    ({teacher.department.nameCn})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-title-2 mb-4">
          {t("schedule", { count: schedules.length })}
        </h2>
        {schedules.length > 0 ? (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="schedule-card">
                <div className="mb-2">
                  <h3 className="text-subtitle font-semibold">
                    {dayjs(schedule.date).format("MMMM D, YYYY")}
                  </h3>
                  <p className="text-small text-muted">
                    {formatWeekday(dayjs(schedule.date).day())}
                  </p>
                </div>
                <div className="space-y-1 text-body text-muted-strong">
                  <p>
                    <strong>{t("time")}:</strong> {schedule.startTime} -{" "}
                    {schedule.endTime}
                  </p>
                  <p>
                    <strong>{t("units")}:</strong> {schedule.startUnit} -{" "}
                    {schedule.endUnit}
                  </p>
                  {schedule.weekIndex && (
                    <p>
                      <strong>{t("week")}:</strong> {schedule.weekIndex}
                    </p>
                  )}
                  {schedule.customPlace ? (
                    <p>
                      <strong>{t("location")}:</strong> {schedule.customPlace}
                    </p>
                  ) : (
                    schedule.room && (
                      <p>
                        <strong>{t("location")}:</strong> {schedule.room.nameCn}
                        {schedule.room.building && (
                          <span className="text-muted">
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
                    <p>
                      <strong>{t("teacher")}:</strong> {schedule.teacher.nameCn}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">{t("noSchedule")}</p>
        )}
      </div>
    </main>
  );
}
