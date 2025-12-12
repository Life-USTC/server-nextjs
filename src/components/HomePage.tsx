"use client";

import {
  ApiOutlined,
  AppstoreOutlined,
  BookOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Statistic,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/page.module.scss";
import AppLayout from "@/components/AppLayout";

const { Title, Paragraph } = Typography;

interface HomePageProps {
  stats: {
    courses: number;
    semesters: number;
  };
  recentSemesters: Array<{
    id: string;
    name: string;
    code: string;
    startDate: Date | null;
    endDate: Date | null;
  }>;
}

export default function HomePage({ stats }: HomePageProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = () => {
    if (searchValue.trim()) {
      router.push(`/courses?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  return (
    <AppLayout>
      <div className={styles.hero}>
        <Title level={2} className={styles.heroTitle}>
          Course & Schedule Manager
        </Title>
        <Paragraph className={styles.heroDescription}>
          Browse courses, view sections, and manage your schedule
        </Paragraph>

        <Space.Compact size="large" className={styles.searchBox}>
          <Input
            size="large"
            placeholder="Search for courses..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" size="large" onClick={handleSearch}>
            Search
          </Button>
        </Space.Compact>
      </div>

      <Row gutter={[16, 16]} className={styles.statsGrid}>
        <Col xs={24} sm={12}>
          <Link href="/courses" className={styles.statCard}>
            <Card hoverable>
              <Statistic
                title="Courses"
                value={stats.courses}
                prefix={<BookOutlined />}
                valueStyle={{ color: "var(--color-primary)" }}
              />
              <Paragraph
                type="secondary"
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                Browse all available courses
              </Paragraph>
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12}>
          <Link href="/sections" className={styles.statCard}>
            <Card hoverable>
              <Statistic
                title="Sections"
                value="Browse"
                prefix={<AppstoreOutlined />}
                valueStyle={{ color: "var(--color-primary)" }}
              />
              <Paragraph
                type="secondary"
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                View course sections and schedules
              </Paragraph>
            </Card>
          </Link>
        </Col>
      </Row>

      <Card className={styles.apiCard} styles={{ body: { padding: "24px" } }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
              <ApiOutlined /> API Access
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
              Programmatically access course and schedule data
            </Paragraph>
          </div>
          <div className={styles.apiEndpoints}>
            <div className={styles.apiEndpoint}>
              <code>GET /api/courses</code>
              <span>List all courses with filters</span>
            </div>
            <div className={styles.apiEndpoint}>
              <code>GET /api/sections</code>
              <span>Get course sections</span>
            </div>
            <div className={styles.apiEndpoint}>
              <code>GET /api/schedules</code>
              <span>Retrieve schedules</span>
            </div>
          </div>
          <Link href="/api/metadata">
            <Button type="link" style={{ paddingLeft: 0 }}>
              View full API documentation →
            </Button>
          </Link>
        </Space>
      </Card>
    </AppLayout>
  );
}
