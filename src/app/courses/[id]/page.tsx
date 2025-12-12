import { ArrowLeftOutlined, BookOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Tag, Typography } from "antd";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { db } from "@/lib/db";
import styles from "./page.module.scss";

const { Title } = Typography;

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCourse(id: number) {
  try {
    const course = await db.course.findUnique({
      where: { id },
      include: {
        type: true,
        educationLevel: true,
        category: true,
        classType: true,
        classify: true,
        gradation: true,
        sections: {
          take: 10,
          include: {
            semester: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            id: "desc",
          },
        },
      },
    });

    return course;
  } catch (error) {
    console.error("Failed to fetch course:", error);
    return null;
  }
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const course = await getCourse(Number.parseInt(id, 10));

  if (!course) {
    notFound();
  }

  return (
    <AppLayout>
      <div className={styles.backButton}>
        <Link href="/courses">
          <Button icon={<ArrowLeftOutlined />}>Back to Courses</Button>
        </Link>
      </div>

      <Card className={styles.detailCard}>
        <div className={styles.header}>
          <div>
            <Title level={2} className={styles.title}>
              <span>
                <BookOutlined /> {course.nameCn}
              </span>
            </Title>
            {course.nameEn && (
              <div className={styles.subtitle}>{course.nameEn}</div>
            )}
          </div>
          <Tag color="blue" className={styles.codeTag}>
            {course.code}
          </Tag>
        </div>

        <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }}>
          <Descriptions.Item label="Course Code">
            {course.code}
          </Descriptions.Item>
          <Descriptions.Item label="JW ID">{course.jwId}</Descriptions.Item>
          <Descriptions.Item label="Type">
            {course.type ? course.type.nameCn : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Education Level">
            {course.educationLevel ? course.educationLevel.nameCn : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Category">
            {course.category ? course.category.nameCn : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Class Type">
            {course.classType ? course.classType.nameCn : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Classify">
            {course.classify ? course.classify.nameCn : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Gradation">
            {course.gradation ? course.gradation.nameCn : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {course.sections && course.sections.length > 0 && (
        <Card title="Recent Sections" className={styles.sectionsCard}>
          <div className={styles.sectionsList}>
            {course.sections.map((section: (typeof course.sections)[0]) => (
              <Link
                key={section.id}
                href={`/sections/${section.id}`}
                className={styles.sectionItem}
              >
                <Card size="small" hoverable>
                  <div className={styles.sectionContent}>
                    <div>
                      <strong>Section {section.code}</strong>
                      {section.semester && (
                        <div className={styles.semesterInfo}>
                          {section.semester.name}
                        </div>
                      )}
                    </div>
                    <Tag>Credits: {section.credits || "N/A"}</Tag>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {(!course.sections || course.sections.length === 0) && (
        <Alert
          message="No sections available for this course"
          type="info"
          showIcon
        />
      )}
    </AppLayout>
  );
}
