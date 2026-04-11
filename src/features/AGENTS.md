# src/features/

按用户任务组织的业务域。每个 feature 通常包含：

- `components/`: UI 组件
- `server/`: 服务端数据获取函数
- `lib/`: 共享逻辑

## 各 feature

| Feature | 职责 |
| --- | --- |
| `home/` | 首页 dashboard 各 tab 的数据聚合和展示 |
| `homeworks/` | 作业 CRUD、完成状态追踪、面板展示 |
| `todos/` | 个人待办 CRUD |
| `comments/` | 评论 CRUD、回复、表情回应、审核 |
| `uploads/` | 文件上传（presigned URL 流程）、配额管理 |
| `descriptions/` | 对象描述（Markdown）读写与历史 |
| `dashboard-links/` | 首页链接书签的固定和访问追踪 |
| `bus/` | 校车时刻表查询、路线偏好、地图 |

## 约定

- 新增 feature 时在此目录创建子目录，不要把业务逻辑散落在 `src/app` 或 `src/lib`
- 服务端数据函数放 `server/`，用于 Server Component 直接调用
- 涉及新模型时需同步更新 seed 数据（`tools/seed-dev-scenarios.ts`）
