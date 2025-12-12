"use client";

import { AppstoreOutlined } from "@ant-design/icons";
import { Alert, Card, Typography } from "antd";
import AppLayout from "@/components/AppLayout";

const { Title } = Typography;

export default function SectionsPage() {
  return (
    <AppLayout>
      <div style={{ marginBottom: "24px" }}>
        <Title level={2}>
          <span>
            <AppstoreOutlined /> Sections
          </span>
        </Title>
      </div>

      <Card>
        <Alert
          message="Coming Soon"
          description="The sections listing page is under development."
          type="info"
          showIcon
        />
      </Card>
    </AppLayout>
  );
}
