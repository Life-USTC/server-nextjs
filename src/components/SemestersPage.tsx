"use client";

import { CalendarOutlined } from "@ant-design/icons";
import { Card, Space, Typography } from "antd";
import Link from "next/link";
import styles from "@/app/semesters/page.module.scss";
import AppLayout from "@/components/AppLayout";

const { Title, Text } = Typography;

interface SemesterItem {
  id: number;
  name: string;
  code: string;
  startDate: Date | null;
  endDate: Date | null;
}

interface SemestersPageProps {
  semesters: SemesterItem[];
}

export default function SemestersPage({ semesters }: SemestersPageProps) {
  return (
    <AppLayout>
      <div className={styles.header}>
        <Title level={2}>
          <span>
            <CalendarOutlined /> Semesters
          </span>
        </Title>
      </div>

      <Card className={styles.semestersCard}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {semesters.length > 0 ? (
            semesters.map((semester) => (
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
