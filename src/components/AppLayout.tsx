"use client";

import {
  AppstoreOutlined,
  BookOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppLayout.module.scss";

const { Header, Content, Footer } = Layout;

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
      key: "/courses",
      icon: <BookOutlined />,
      label: <Link href="/courses">Courses</Link>,
    },
    {
      key: "/sections",
      icon: <AppstoreOutlined />,
      label: <Link href="/sections">Sections</Link>,
    },
  ];

  // Determine selected key based on pathname - fix the logic
  const getSelectedKey = () => {
    if (pathname === "/") return "/";

    // Sort by key length descending to match more specific paths first
    const sortedItems = [...menuItems].sort(
      (a, b) => b.key.length - a.key.length,
    );
    const match = sortedItems.find(
      (item) => item.key !== "/" && pathname.startsWith(item.key),
    );
    return match ? match.key : "/";
  };

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logo}>
            USTC Course Manager
          </Link>
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
          <span>© {new Date().getFullYear()} USTC Course Manager</span>
          <Link href="/api/metadata" className={styles.footerLink}>
            API Docs
          </Link>
        </div>
      </Footer>
    </Layout>
  );
}
