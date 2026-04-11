# 产品与用户体验

Life@USTC 把分散的教务信息重新组织成一个帮助用户判断"接下来该做什么"的工作台。

## 核心概念

- **Section（班级）** 是核心工作单元：课程、教师、时间、作业、考试、评论都汇合在这里
- **评论**依附对象存在（班级、课程、教师、作业），不是独立社区
- 所有模型服务于同一个决策："接下来做什么"

---

## Web 页面

### 首页 `/`

用户应该能立即回答：今天有什么事、哪些作业考试最紧急、该进入哪个班级。

| Tab | 内容 | 用户动作 |
| --- | --- | --- |
| 概览 | 本周课表 + 待办 + 即将到期的作业/考试 | 点击进入具体对象 |
| 作业 | 按班级分组的作业列表，含状态和截止时间 | 标记完成、创建作业、查看详情 |
| 日历 | 月/周视图的课程和事件 | 切换视图、点击事件跳转 |
| 考试 | 考试时间表，按时间排序 | 筛选、跳转班级 |
| 订阅 | 已订阅班级管理 + iCal 链接 | 复制日历链接、批量导入班级 |
| 校车 | 校园班车时刻表和路线 | 查询路线、保存偏好 |
| 链接 | 常用站内外链接书签 | 固定/取消固定链接 |

### 班级详情 `/sections/[jwId]`

一个班级的完整落点，用户应看到：

- 基本信息：课程名、学分、教师、上课时间地点
- 考试安排
- 该班级的作业列表（可创建、标记完成）
- 评论区（发表、回复、点赞、举报）
- 描述/笔记（管理员可编辑的 Markdown）
- 订阅/退订按钮

### 课程浏览 `/courses` → `/courses/[jwId]`

- 列表页：搜索（中英文/课程代码）、按类别/层次/类型筛选、分页
- 详情页：课程信息 + 下属班级列表 + 评论 + 描述
- 目的：帮用户发现并进入具体班级

### 教师浏览 `/teachers` → `/teachers/[id]`

- 列表页：搜索、按院系筛选、分页
- 详情页：教师信息 + 开设班级 + 评论
- 目的：帮用户通过教师找到班级

### 设置 `/settings`

| 子页 | 内容 |
| --- | --- |
| 个人资料 | 姓名、用户名、头像 |
| 关联账户 | OAuth 登录方式管理、解绑 |
| 内容 | 评论和描述管理入口 |
| 危险操作 | 删除账户（需确认） |

### 管理后台 `/admin`（仅管理员）

| 子页 | 能力 |
| --- | --- |
| 内容审核 | 查看/隐藏/删除评论，封禁用户 |
| 用户管理 | 搜索用户、编辑、封禁/解封 |
| OAuth 客户端 | 注册/管理第三方应用 |

### 欢迎页 `/welcome`

新用户首次登录后必须完善资料（姓名、用户名），完成后跳转首页。

### OAuth 授权 `/oauth/authorize`

第三方应用授权同意页：显示应用名称和请求权限，用户同意或拒绝。

---

## API（REST / OpenAPI）

所有 API 在 `/api` 下，运行应用后访问 `/api-docs` 查看完整文档。

### 主要资源

| 路径 | 操作 |
| --- | --- |
| `/api/sections` | 搜索班级、获取详情、课表、iCal 导出 |
| `/api/courses` | 搜索课程 |
| `/api/teachers` | 搜索教师 |
| `/api/homeworks` | 作业 CRUD、完成状态切换 |
| `/api/todos` | 待办 CRUD |
| `/api/comments` | 评论 CRUD、表情回应 |
| `/api/uploads` | 文件上传（presigned URL → S3 → finalize） |
| `/api/descriptions` | 对象描述（Markdown）读写 |
| `/api/bus` | 校车时刻表查询、偏好保存 |
| `/api/dashboard-links` | 链接固定、访问记录 |
| `/api/calendar-subscriptions` | 日历订阅信息 |
| `/api/semesters` | 学期列表与当前学期 |
| `/api/admin/*` | 管理员操作（评论审核、用户管理、封禁） |

### 鉴权

- 站内请求：session cookie
- 外部客户端：Bearer token（OAuth JWT，通过 JWKS 验证）
- OAuth 授权码流 + PKCE，支持 OpenID Connect

### 分页

标准格式：`{ data: [...], pagination: { page, pageSize, total, totalPages } }`

---

## MCP（Model Context Protocol）

为 AI / agent / 工具客户端提供受约束的操作面，端点：`/api/mcp`。

### 可用工具

| 工具 | 功能 |
| --- | --- |
| `get_my_profile` / `update_my_profile` | 个人资料读写 |
| `list_my_homeworks` / `set_my_homework_completion` | 作业列表与完成状态 |
| `list_my_todos` / `create_my_todo` / `update_my_todo` / `delete_my_todo` | 待办 CRUD |
| `list_my_sections` | 已订阅班级 |
| `search_courses` / `get_course` | 课程搜索与详情 |
| `get_section` / `get_section_comments` / `list_section_homeworks` | 班级信息 |
| `get_my_calendar` / `get_calendar_export_url` | 日历数据与 iCal 链接 |
| `get_bus_routes` / `query_bus_schedule` | 校车路线与时刻表 |

所有工具支持 `mode` 参数：`json`（结构化）/ `compact`（精简）/ `text`（可读）

OAuth scope：`mcp:tools`

---

## 业务逻辑详解

### 作业（Homework）

- **归属**：作业属于某个 section
- **创建**：标题、是否重要（isMajor）、是否需要组队（requiresTeam）、发布时间、截止时间
- **完成追踪**：每个用户独立的完成状态（HomeworkCompletion），记录完成时间
- **展示**：在首页作业 tab 按班级分组显示，在班级详情页显示该班级的作业
- **用户链路**：首页看到截止时间 → 点击进入班级 → 查看作业详情 → 标记完成

### 待办（Todo）

- **归属**：纯个人，不与班级关联
- **字段**：标题（200字）、内容（4000字 Markdown）、优先级（low/medium/high）、截止时间
- **展示**：首页概览中与课程事件并列展示
- **用户链路**：首页创建待办 → 设置优先级和截止时间 → 完成后删除

### 评论（Comment）

- **依附对象**：section、course、teacher、homework、section-teacher
- **可见性**：公开 / 仅登录用户 / 匿名
- **内容**：Markdown（支持数学公式、emoji、表格）
- **互动**：回复（嵌套）、表情回应（✓❌👍👎❤️🎉😕🤔）
- **审核**：管理员可隐藏/删除，被封禁用户无法发表
- **编辑历史**：所有修改记录 previousContent + editor
- **用户链路**：进入班级/课程/教师页 → 查看评论 → 发表/回复/点赞

### 订阅（Subscription）

- **含义**：用户"关注"某个班级，该班级的课表、作业、考试会出现在首页
- **日历**：订阅的班级课表可导出为 iCal（`/api/sections/calendar.ics`）
- **批量导入**：支持通过课程代码批量订阅班级

### 上传（Upload）

- **流程**：请求 presigned URL → 直传 S3 → finalize 确认
- **配额**：每用户有存储上限，上传前检查
- **用途**：评论附件、描述附件

### 描述（Description）

- **含义**：附加在 section/course/teacher/homework 上的 Markdown 笔记
- **编辑**：管理员可编辑，保留完整编辑历史
- **用途**：补充结构化数据无法表达的信息（课程经验、选课建议等）

### 校车（Bus）

- **数据**：多校区间的班车路线和时刻表
- **查询**：选择出发/到达校区 → 查看可用班次和预计到达时间
- **偏好**：用户可保存常用路线
- **日期类型**：自动识别工作日/周末，显示对应时刻表

### Dashboard 链接

- **含义**：首页常用链接书签（教务系统、图书馆、邮箱等外部站点）
- **操作**：固定到首页、记录点击
