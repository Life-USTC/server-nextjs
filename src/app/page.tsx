import {
  AppstoreOutlined,
  BookOutlined,
  CalendarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Alert, Card, Col, Row, Space, Statistic, Typography } from "antd";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { db } from "@/lib/db";
import styles from "./page.module.scss";

const { Title, Paragraph, Text } = Typography;

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [coursesCount, semestersCount] = await Promise.all([
      db.course.count(),
      db.semester.count(),
    ]);

    return {
      courses: coursesCount,
      semesters: semestersCount,
    };
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return {
      courses: 0,
      semesters: 0,
    };
  }
}

async function getRecentSemesters() {
  try {
    const semesters = await db.semester.findMany({
      orderBy: { startDate: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        code: true,
        startDate: true,
        endDate: true,
      },
    });
    return semesters;
  } catch (error) {
    console.error("Failed to fetch semesters:", error);
    return [];
  }
}

export default async function Home() {
  const stats = await getStats();
  const recentSemesters = await getRecentSemesters();

  return (
    <AppLayout>
      <div className={styles.hero}>
        <Title level={1} className={styles.heroTitle}>
          Life@USTC
        </Title>
        <Paragraph className={styles.heroDescription}>
          Your comprehensive course and schedule management system
        </Paragraph>
      </div>

      <Row gutter={[16, 16]} className={styles.statsGrid}>
        <Col xs={24} sm={12} lg={6}>
          <Link href="/semesters" className={styles.statCard}>
            <Card hoverable>
              <Statistic
                title="Semesters"
                value={stats.semesters}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: "var(--color-primary)" }}
              />
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Link href="/courses" className={styles.statCard}>
            <Card hoverable>
              <Statistic
                title="Courses"
                value={stats.courses}
                prefix={<BookOutlined />}
                valueStyle={{ color: "var(--color-primary)" }}
              />
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Link href="/sections" className={styles.statCard}>
            <Card hoverable>
              <Statistic
                title="Sections"
                value="-"
                prefix={<AppstoreOutlined />}
                valueStyle={{ color: "var(--color-primary)" }}
              />
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Link href="/teachers" className={styles.statCard}>
            <Card hoverable>
              <Statistic
                title="Teachers"
                value="-"
                prefix={<TeamOutlined />}
                valueStyle={{ color: "var(--color-primary)" }}
              />
            </Card>
          </Link>
        </Col>
      </Row>

      <Card title="Recent Semesters" className={styles.recentCard}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {recentSemesters.length > 0 ? (
            recentSemesters.map((semester: (typeof recentSemesters)[0]) => (
              <Link
                key={semester.id}
                href={`/semesters/${semester.id}`}
                className={styles.semesterItem}
              >
                <Card size="small" hoverable className={styles.semesterCard}>
                  <div className={styles.semesterContent}>
                    <div>
                      <Text strong>{semester.name}</Text>
                      {semester.startDate && semester.endDate && (
                        <div>
                          <Text
                            type="secondary"
                            style={{ fontSize: "0.875rem" }}
                          >
                            {new Date(semester.startDate).toLocaleDateString()}{" "}
                            - {new Date(semester.endDate).toLocaleDateString()}
                          </Text>
                        </div>
                      )}
                    </div>
                    <Text code>{semester.code}</Text>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <Alert message="No semesters available" type="info" showIcon />
          )}
        </Space>
      </Card>

      <Card title="API Access" className={styles.apiCard}>
        <Paragraph>
          This system provides a RESTful API for programmatic access:
        </Paragraph>
        <ul className={styles.apiList}>
          <li>
            <code>GET /api/courses</code> - List all courses
          </li>
          <li>
            <code>GET /api/semesters</code> - List all semesters
          </li>
          <li>
            <code>GET /api/sections</code> - List all sections
          </li>
          <li>
            <code>GET /api/schedules</code> - Get schedules
          </li>
        </ul>
        <Paragraph style={{ marginTop: 16 }}>
          Visit the{" "}
          <Link href="/api/metadata" style={{ color: "var(--color-primary)" }}>
            API metadata endpoint
          </Link>{" "}
          for more information.
        </Paragraph>
      </Card>
    </AppLayout>
  );
}
