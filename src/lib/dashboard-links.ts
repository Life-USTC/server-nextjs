export type DashboardLinkCategory =
  | "academic"
  | "community"
  | "services"
  | "campus";

export type DashboardLinkIcon =
  | "book-open"
  | "clipboard-list"
  | "building"
  | "graduation-cap"
  | "mail"
  | "monitor-play"
  | "network"
  | "school"
  | "users";

export type DashboardLinkItem = {
  slug: string;
  title: string;
  url: string;
  description: string;
  category: DashboardLinkCategory;
  icon: DashboardLinkIcon;
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
    icon: "clipboard-list",
  },
  {
    slug: "icourse",
    title: "评课社区",
    url: "https://icourse.club/",
    description: "课程评价与经验分享。",
    category: "community",
    icon: "users",
  },
  {
    slug: "mail",
    title: "邮箱",
    url: "https://mail.ustc.edu.cn/",
    description: "USTC 邮件系统。",
    category: "services",
    icon: "mail",
  },
  {
    slug: "library",
    title: "图书馆",
    url: "http://lib.ustc.edu.cn/",
    description: "图书检索与数据库资源。",
    category: "academic",
    icon: "book-open",
  },
  {
    slug: "official",
    title: "科大官网",
    url: "https://www.ustc.edu.cn/",
    description: "学校新闻与公告。",
    category: "campus",
    icon: "school",
  },
  {
    slug: "course-platform",
    title: "网络教学平台",
    url: "https://course.ustc.edu.cn/portal",
    description: "课程资料与在线学习。",
    category: "academic",
    icon: "monitor-play",
  },
  {
    slug: "education-office",
    title: "教务处",
    url: "https://www.teach.ustc.edu.cn/",
    description: "教学管理与通知。",
    category: "services",
    icon: "graduation-cap",
  },
  {
    slug: "nan7",
    title: "南七集市",
    url: "https://nan7market.com/",
    description: "校园社区信息平台。",
    category: "community",
    icon: "building",
  },
  {
    slug: "network",
    title: "网络通",
    url: "http://wlt.ustc.edu.cn/",
    description: "网络服务与套餐办理。",
    category: "services",
    icon: "network",
  },
];

export type LinkClickStats = Record<string, number>;

export type RecommendationStrategy = "frequency-v1";

export function recommendDashboardLinks(
  clickStats: LinkClickStats,
  options: {
    strategy?: RecommendationStrategy;
    limit?: number;
    excludeSlugs?: string[];
  } = {},
): DashboardLinkItem[] {
  const strategy = options.strategy ?? "frequency-v1";
  const limit = options.limit ?? 3;
  const excluded = new Set(options.excludeSlugs ?? []);
  const candidateLinks = USTC_DASHBOARD_LINKS.filter(
    (link) => !excluded.has(link.slug),
  );

  // Keep strategy switch for future ML/personalization algorithms.
  if (strategy !== "frequency-v1") {
    return candidateLinks.slice(0, limit);
  }

  return [...candidateLinks]
    .sort((left, right) => {
      const rightCount = clickStats[right.slug] ?? 0;
      const leftCount = clickStats[left.slug] ?? 0;
      if (rightCount === leftCount) {
        return left.title.localeCompare(right.title, "zh-CN");
      }
      return rightCount - leftCount;
    })
    .slice(0, limit);
}
