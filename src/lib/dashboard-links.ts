export type DashboardLinkCategory =
  | "academic"
  | "community"
  | "services"
  | "campus";

export type DashboardLinkItem = {
  slug: string;
  title: string;
  url: string;
  description: string;
  category: DashboardLinkCategory;
};

/**
 * Curated from https://github.com/SmartHypercube/ustclife (CC BY-SA 4.0).
 */
export const USTC_DASHBOARD_LINKS: DashboardLinkItem[] = [
  {
    slug: "jw",
    title: "教务系统",
    url: "https://jw.ustc.edu.cn/",
    description: "选课、成绩与教学事务。",
    category: "academic",
  },
  {
    slug: "icourse",
    title: "评课社区",
    url: "https://icourse.club/",
    description: "课程评价与经验分享。",
    category: "community",
  },
  {
    slug: "mail",
    title: "邮箱",
    url: "https://mail.ustc.edu.cn/",
    description: "USTC 邮件系统。",
    category: "services",
  },
  {
    slug: "library",
    title: "图书馆",
    url: "http://lib.ustc.edu.cn/",
    description: "图书检索与数据库资源。",
    category: "academic",
  },
  {
    slug: "official",
    title: "科大官网",
    url: "https://www.ustc.edu.cn/",
    description: "学校新闻与公告。",
    category: "campus",
  },
  {
    slug: "course-platform",
    title: "网络教学平台",
    url: "https://course.ustc.edu.cn/portal",
    description: "课程资料与在线学习。",
    category: "academic",
  },
  {
    slug: "education-office",
    title: "教务处",
    url: "https://www.teach.ustc.edu.cn/",
    description: "教学管理与通知。",
    category: "services",
  },
  {
    slug: "nan7",
    title: "南七集市",
    url: "https://nan7market.com/",
    description: "校园社区信息平台。",
    category: "community",
  },
  {
    slug: "network",
    title: "网络通",
    url: "http://wlt.ustc.edu.cn/",
    description: "网络服务与套餐办理。",
    category: "services",
  },
];

export type LinkClickStats = Record<string, number>;

export type RecommendationStrategy = "frequency-v1";

export function recommendDashboardLinks(
  clickStats: LinkClickStats,
  strategy: RecommendationStrategy = "frequency-v1",
): DashboardLinkItem[] {
  // Keep strategy switch for future ML/personalization algorithms.
  if (strategy !== "frequency-v1") {
    return USTC_DASHBOARD_LINKS.slice(0, 3);
  }

  return [...USTC_DASHBOARD_LINKS]
    .sort((left, right) => {
      const rightCount = clickStats[right.slug] ?? 0;
      const leftCount = clickStats[left.slug] ?? 0;
      if (rightCount === leftCount) {
        return left.title.localeCompare(right.title, "zh-CN");
      }
      return rightCount - leftCount;
    })
    .slice(0, 3);
}
