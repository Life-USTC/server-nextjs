import { CalendarOutlined } from "@ant-design/icons";
import { Card, Space, Typography } from "antd";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { db } from "@/lib/db";
import styles from "./page.module.scss";

const { Title, Text } = Typography;

async function getSemesters() {
  try {
    const semesters = await db.semester.findMany({
      orderBy: { startDate: "desc" },
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

export default async function SemestersPage() {
  const semesters = await getSemesters();

  return (
    <AppLayout>
      <div className={styles.header}>
        <Title level={2}>
          <CalendarOutlined /> Semesters
        </Title>
      </div>

      <Card className={styles.semestersCard}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {semesters.length > 0 ? (
            semesters.map((semester: (typeof semesters)[0]) => (
              <Link
                key={semester.id}
                href={`/semesters/${semester.id}`}
                className={styles.semesterItem}
              >
                <Card size="small" hoverable className={styles.semesterCard}>
                  <div className={styles.semesterContent}>
                    <div className={styles.semesterInfo}>
                      <Text strong className={styles.semesterName}>
                        {semester.name}
                      </Text>
                      {semester.startDate && semester.endDate && (
                        <div className={styles.semesterDates}>
                          <CalendarOutlined />{" "}
                          {new Date(semester.startDate).toLocaleDateString()} -{" "}
                          {new Date(semester.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <Text code className={styles.semesterCode}>
                      {semester.code}
                    </Text>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <Card>
              <Text type="secondary">No semesters available</Text>
            </Card>
          )}
        </Space>
      </Card>
    </AppLayout>
  );
}
