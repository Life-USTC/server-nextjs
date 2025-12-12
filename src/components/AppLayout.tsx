"use client";

import {
  AppstoreOutlined,
  BookOutlined,
  CalendarOutlined,
  HomeOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Space, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppLayout.module.scss";

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      key: "/",
      icon: <HomeOutlined />,
      label: <Link href="/">Home</Link>,
    },
    {
      key: "/semesters",
      icon: <CalendarOutlined />,
      label: <Link href="/semesters">Semesters</Link>,
    },
    {
      key: "/courses",
      icon: <BookOutlined />,
      label: <Link href="/courses">Courses</Link>,
    },
    {
      key: "/teachers",
      icon: <TeamOutlined />,
      label: <Link href="/teachers">Teachers</Link>,
    },
    {
      key: "/sections",
      icon: <AppstoreOutlined />,
      label: <Link href="/sections">Sections</Link>,
    },
  ];

  // Determine selected key based on pathname
  const getSelectedKey = () => {
    if (pathname === "/") return "/";
    const match = menuItems.find((item) => pathname.startsWith(item.key));
    return match ? match.key : "/";
  };

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.headerContent}>
          <Space align="center" size="large">
            <Title level={3} className={styles.logo}>
              Life@USTC
            </Title>
          </Space>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            className={styles.menu}
          />
        </div>
      </Header>
      <Content className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </Content>
      <Footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span>
            © {new Date().getFullYear()} Life@USTC - All Rights Reserved
          </span>
          <Link href="/api/metadata" className={styles.footerLink}>
            API Documentation
          </Link>
        </div>
      </Footer>
    </Layout>
  );
}
