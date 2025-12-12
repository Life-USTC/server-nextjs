import { AppstoreOutlined } from "@ant-design/icons";
import { Alert, Card, Typography } from "antd";
import AppLayout from "@/components/AppLayout";
import styles from "./page.module.scss";

const { Title } = Typography;

export default function SectionsPage() {
  return (
    <AppLayout>
      <div className={styles.header}>
        <Title level={2}>
          <AppstoreOutlined /> Sections
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
