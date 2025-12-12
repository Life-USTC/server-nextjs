"use client";

import { TeamOutlined } from "@ant-design/icons";
import { Alert, Card, Typography } from "antd";
import AppLayout from "@/components/AppLayout";

const { Title } = Typography;

export default function TeachersPage() {
  return (
    <AppLayout>
      <div style={{ marginBottom: "24px" }}>
        <Title level={2}>
          <span>
            <TeamOutlined /> Teachers
          </span>
        </Title>
      </div>

      <Card>
        <Alert
          message="Coming Soon"
          description="The teachers listing page is under development."
          type="info"
          showIcon
        />
      </Card>
    </AppLayout>
  );
}
