"use client";

import { BookOutlined, SearchOutlined } from "@ant-design/icons";
import { Card, Form, Input, Space, Table, Tag, Typography } from "antd";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import styles from "@/app/courses/page.module.scss";

const { Title } = Typography;

interface CourseItem {
  id: number;
  code: string;
  nameCn: string;
  nameEn: string | null;
  type: { nameCn: string } | null;
  educationLevel: { nameCn: string } | null;
  category: { nameCn: string } | null;
}

interface CoursesPageProps {
  searchTerm?: string;
  courses: CourseItem[];
}

export default function CoursesPage({ searchTerm, courses }: CoursesPageProps) {
  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 120,
      render: (code: string) => <strong>{code}</strong>,
    },
    {
      title: "Name",
      key: "name",
      render: (_: unknown, record: CourseItem) => (
        <Link href={`/courses/${record.id}`} className={styles.courseLink}>
          <div>
            <div className={styles.courseName}>{record.nameCn}</div>
            {record.nameEn && (
              <div className={styles.courseNameEn}>{record.nameEn}</div>
            )}
          </div>
        </Link>
      ),
    },
    {
      title: "Type",
      key: "type",
      render: (_: unknown, record: CourseItem) =>
        record.type ? <Tag color="blue">{record.type.nameCn}</Tag> : "-",
    },
    {
      title: "Education Level",
      key: "educationLevel",
      render: (_: unknown, record: CourseItem) =>
        record.educationLevel ? (
          <Tag color="green">{record.educationLevel.nameCn}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Category",
      key: "category",
      render: (_: unknown, record: CourseItem) =>
        record.category ? <Tag>{record.category.nameCn}</Tag> : "-",
    },
  ];

  return (
    <AppLayout>
      <div className={styles.header}>
        <Title level={2}>
          <span>
            <BookOutlined /> Courses
          </span>
        </Title>
      </div>

      <Card className={styles.searchCard}>
        <Form method="get" action="/courses">
          <Space.Compact style={{ width: "100%" }}>
            <Input
              name="q"
              placeholder="Search by name or code..."
              defaultValue={searchTerm}
              prefix={<SearchOutlined />}
              size="large"
              allowClear
            />
          </Space.Compact>
        </Form>
      </Card>

      <Card className={styles.tableCard}>
        <div className={styles.resultCount}>
          Found {courses.length} course{courses.length !== 1 ? "s" : ""}
        </div>
        <Table
          columns={columns}
          dataSource={courses}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} courses`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </AppLayout>
  );
}
