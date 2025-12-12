import { TeamOutlined } from "@ant-design/icons";
import { Alert, Card, Typography } from "antd";
import AppLayout from "@/components/AppLayout";
import styles from "./page.module.scss";

const { Title } = Typography;

export default function TeachersPage() {
  return (
    <AppLayout>
      <div className={styles.header}>
        <Title level={2}>
          <TeamOutlined /> Teachers
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
