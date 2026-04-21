# Life@USTC 功能现状

Life@USTC 是面向中国科大学生的整合平台，并兼顾高频校园生活服务信息。产品将教务数据、课程与班级信息、课表、作业、考试、个人待办、校车时刻表和常用链接整合到同一入口，降低学生在多个平台之间查找、确认和维护信息的成本。

本文档描述**当前项目中的实际行为与接口现状**，不是需求池、路线图或实施计划。若代码实现与文档不一致，应以修正文档或实现后再次修正文档的方式保持两者同步，而不是在本文档中保留“待实现”“后续补齐”“应该支持”等计划性表述。

## 范围

### 背景

中国科大学生需要处理的信息分散在多个来源：

* 教务系统 <https://jw.ustc.edu.cn> 中的学期、课程、班级、课表和考试。
* BB <https://bb.ustc.edu.cn> / 研究生平台 <https://yjs1.ustc.edu.cn> 中班级相关的作业、讨论和补充说明。
* 其他信息来源：例如个人待办、校车时刻表和常用链接。

### 产品目标

* 为已登录用户提供个人工作台，集中展示今日与本周课表、临近截止作业、未完成待办和即将到来的考试。
* 为匿名访客和未完成个人化配置的用户提供公开浏览入口，包括课程、班级、教师、校车和常用链接。
* 为外部客户端和 Agent 提供受控访问能力，包括公开 REST API、OpenAPI 文档和 MCP 工具；当前带用户上下文的主路径由 OAuth 授权的 REST 与 MCP 入口共同承接。
* 为管理员提供平台维护能力，包括评论审核、描述维护、用户管理、OAuth 客户端管理、校车与基础数据维护。

### 非目标

- Life@USTC 不替代官方教务系统：不提供官方选课能力，不提供成绩、学籍、培养方案审批等官方教务能力，不改变教务系统中的课程、班级、课表或考试事实。

### 产品原则

* **一个产品模型，多种入口**：Web、REST API 和 MCP 逻辑设计上是统一的，鉴权和逻辑限制都是一致的，提供不同入口方便用户使用。
* **抽象 endpoint 信息对齐**：`相关接口` 中的每个 endpoint / entrypoint 代表同一个产品能力。当前 Web、REST API 和 MCP 在同一能力上共享同一对象语义与权限边界；不同之处主要体现在交互方式和序列化层次。
* **教务事实只读，个人状态可写**：学期、课程、班级、课表和考试来自教务或导入数据，用户和管理员都无法修改以保证数据一致性；用户可写的是关注班级关系、作业完成状态、待办、评论等个人或协作状态。
* **关注班级不等于官方选课**：站内关注关系只决定首页、日历、作业和考试等个性化展示范围，不代表教务系统中的正式选课关系。
* **受保护 API 的当前鉴权形态**：当前普通用户侧受保护 `/api/*` endpoint 同时接受站内 session 与 OAuth bearer token；OAuth 调用的权限判断、字段可见性和错误语义与 Web / MCP 保持一致。管理员接口仍不作为 OAuth client 的默认能力对外开放。
* **OAuth access token 边界**：当前普通用户侧受保护 REST endpoint 接受带用户身份的 OAuth bearer token，但必须是面向站点 issuer 的 access token；省略 `resource` 后获得的 opaque access token 仅用于 MCP，不作为通用 REST 用户凭据。
* **部署 origin 与 canonical origin 分离**：当前部署的公开 origin 用于 OAuth 回调、MCP/OAuth 元数据、日历导出等运行时绝对链接；生产 canonical origin 单独配置，用于 sitemap、robots 和站点级 metadata。
* **生产构建形态**：当前生产发布以 Docker 镜像为准；构建验收通过 `docker build .` 完成，镜像启动时先执行 Prisma 迁移部署，再运行 Next.js standalone server，并携带生产运行需要的公开资源、Prisma schema 与导入工具产物。

### 核心对象术语

| 术语               | 定义                                     | 说明                                     |
| ------------------ | ---------------------------------------- | ---------------------------------------- |
| 学期               | -                                        | -                                        |
| 课程               | 抽象的课程本身，不指代某个学期的具体开课 | 例如“数学分析 A1”                        |
| 班级               | 某课程在某学期的具体教学班               | 课程详情下会有多个班级实例               |
| 关注班级关系       | 用户与班级之间的站内个人关系             | 仅影响站内工作台，不代表官方选课         |
| 课表               | 班级的上课时间、地点和周次               | 来源于教务或导入数据                     |
| 作业               | 依附于班级的学习任务                     | 由登录且未封禁用户协作维护               |
| 作业完成状态       | 用户对某个作业的个人完成标记             | 与作业本体分离                           |
| 待办               | 用户个人任务                             | 不依附班级                               |
| 考试               | 依附于班级的考试安排                     | 高优先级时间事件                         |
| 评论 / 描述 / 上传 | 依附于对象的协作内容                     | 不提供脱离对象上下文的独立社区或资源入口 |

## 通用参考

### 文档约定

* 本章只描述当前项目中的实际行为、接口与界面，不描述待办事项。
* 这里的 endpoint / entrypoint 指**抽象产品入口**，不等价于某一个具体路由或协议实现。
* Web、REST API 和 MCP 都是同一个抽象入口的不同投影。Web 偏交互与视觉层，REST API / MCP 偏结构化数据与动作承接。
* 每个功能模块中的 endpoint 都尽量引用本章前面的共享模型或共享界面，而不是重复定义。

### 模型参考

#### Model: SemesterSummary

* 主键与标识：
  * `semester.id`
  * `semester.jwId`
  * `semester.code`
* 名称与时间：
  * `semester.nameCn`
  * `semester.startDate`
  * `semester.endDate`

#### Model: CourseSummary

* 主键与标识：
  * `course.id`
  * `course.jwId`
  * `course.code`
* 主展示字段：
  * `course.namePrimary`
  * `course.nameSecondary`
* 分类字段：
  * `course.educationLevel?.namePrimary`
  * `course.category?.namePrimary`
  * `course.classType?.namePrimary`
  * `course.classify?.namePrimary`
  * `course.gradation?.namePrimary`
  * `course.type?.namePrimary`

#### Model: CourseDetail

* 继承 [CourseSummary](#model-coursesummary)
* 下属班级：
  * `course.sections[].jwId`
  * `course.sections[].code`
  * `course.sections[].semester?.nameCn`
  * `course.sections[].campus?.namePrimary`
  * `course.sections[].teachers[].namePrimary`
  * `course.sections[].stdCount`
  * `course.sections[].limitCount`

#### Model: SectionSummary

* 主键与标识：
  * `section.id`
  * `section.jwId`
  * `section.code`
* 当前项目中的主展示字段：
  * `section.course.namePrimary`
  * `section.course.nameSecondary`
* 结构化消歧字段：
  * `section.semester?.nameCn`
  * `section.teachers[].namePrimary`
  * `section.credits`
  * `section.stdCount`
  * `section.limitCount`
  * `section.campus?.namePrimary`
  * `section.openDepartment?.namePrimary`

#### Model: SectionDetail

* 继承 [SectionSummary](#model-sectionsummary)
* 详情扩展字段：
  * `section.examMode?.namePrimary`
  * `section.teachLanguage?.namePrimary`
  * `section.roomType?.namePrimary`
  * `section.adminClasses[]`
* 教师与评论上下文：
  * `section.teachers[].id`
  * `section.teachers[].namePrimary`
  * `section.teachers[].department?.namePrimary`
* 课表与考试：
  * `section.schedules[]`
  * `section.scheduleGroups[]`
  * `section.exams[]`

#### Model: TeacherSummary

* 主键与标识：
  * `teacher.id`
  * `teacher.code`
* 主展示字段：
  * `teacher.namePrimary`
  * `teacher.nameSecondary`
* 辅助字段：
  * `teacher.department?.namePrimary`
  * `teacher.teacherTitle?.namePrimary`
  * `teacher.email`
  * `teacher._count.sections`

#### Model: TeacherDetail

* 继承 [TeacherSummary](#model-teachersummary)
* 详情扩展字段：
  * `teacher.telephone`
  * `teacher.mobile`
  * `teacher.address`
  * `teacher.sections[].jwId`
  * `teacher.sections[].code`
  * `teacher.sections[].course.namePrimary`
  * `teacher.sections[].semester?.nameCn`
  * `teacher.sections[].credits`

#### Model: CalendarSubscription

* 用户与说明：
  * `subscription.userId`
  * `subscription.note`
* 班级明细：
  * `subscription.sections[]` 使用 [SectionSummary](#model-sectionsummary)
* 导出字段：
  * `subscription.calendarPath`
  * `subscription.calendarUrl`

#### Model: CalendarEvent

* 统一事件外壳：
  * `event.type`
  * `event.at`
* 事件载荷：
  * `event.payload`
  * `event.payload` 的具体形态取决于 `type`
* 当前事件类型：
  * `schedule`
  * `homework_due`
  * `exam`
  * `todo_due`

#### Model: ScheduleEntry

* 主键与时间：
  * `schedule.id`
  * `schedule.date`
  * `schedule.weekday`
  * `schedule.startTime`
  * `schedule.endTime`
* 所属对象：
  * `schedule.section.jwId`
  * `schedule.section.code`
  * `schedule.section.course.namePrimary`
  * `schedule.section.semester?.nameCn`
* 地点与教师：
  * `schedule.room?.namePrimary`
  * `schedule.room?.building?.namePrimary`
  * `schedule.room?.building?.campus?.namePrimary`
  * `schedule.teachers[].namePrimary`
  * `schedule.scheduleGroup`

#### Model: ExamEntry

* 主键与时间：
  * `exam.id`
  * `exam.jwId`
  * `exam.examDate`
  * `exam.startTime`
  * `exam.endTime`
* 所属对象：
  * `exam.section.jwId`
  * `exam.section.code`
  * `exam.section.course.namePrimary`
  * `exam.section.semester?.nameCn`
* 考试信息：
  * `exam.examBatch`
  * `exam.examRooms[]`

#### Model: HomeworkItem

* 主键与标题：
  * `homework.id`
  * `homework.title`
* 时间字段：
  * `homework.publishedAt`
  * `homework.submissionStartAt`
  * `homework.submissionDueAt`
  * `homework.createdAt`
  * `homework.updatedAt`
  * `homework.deletedAt`
* 所属对象：
  * `homework.sectionId`
  * `homework.section.code`
  * `homework.section.course.namePrimary`
  * `homework.section.semester?.nameCn`
* 协作与个人状态：
  * `homework.description?.content`
  * `homework.createdBy`
  * `homework.updatedBy`
  * `homework.deletedBy`
  * `homework.completion?.completedAt`
  * `homework.commentCount`

#### Model: TodoItem

* 主键与标题：
  * `todo.id`
  * `todo.title`
  * `todo.content`
* 状态字段：
  * `todo.completed`
  * `todo.priority`
  * `todo.dueAt`
  * `todo.createdAt`
  * `todo.updatedAt`

#### Model: OverviewSnapshot

* 用户信息：
  * `overview.user.id`
  * `overview.user.name`
  * `overview.user.image`
  * `overview.user.isAdmin`
* 计数字段：
  * `overview.overview.pendingTodosCount`
  * `overview.overview.pendingHomeworksCount`
  * `overview.overview.todaySchedulesCount`
  * `overview.overview.upcomingExamsCount`
* 示例数据：
  * `overview.samples.dueTodos[]` 使用 [TodoItem](#model-todoitem)
  * `overview.samples.dueHomeworks[]` 使用 [HomeworkItem](#model-homeworkitem)
  * `overview.samples.upcomingExams[]` 使用 [ExamEntry](#model-examentry)

### 界面参考

#### UI: List Table

* 用于课程、班级、教师等发现型列表。
* 主展示信息放在第一视觉列。
* 结构化字段用于消歧与比较。
* 行为为整行可点击，进入详情页。

#### UI: Detail Hero

* 用于课程、班级、教师详情页顶部。
* 包含 breadcrumb、`h1`、可能存在的副标题。
* `h1` 使用当前对象的主展示名称，不默认使用内部 ID。

#### UI: Basic Info Card

* 用于详情页侧栏或折叠面板。
* 展示结构化字段，不承担评论、作业等交互。

#### UI: Context Tabs

* 用于详情页内的多上下文切换。
* 当前常见组合：
  * 班级：作业、日历、评论。
  * 课程：班级、评论。
  * 教师：教学班、评论。

#### UI: Calendar Export Dialog

* 用于展示单对象 iCal 与个人订阅 iCal。
* 当前以可复制链接为主，不要求用户手工拼接 URL。

## 功能模块

本章按**模块**整理当前项目中的功能现状。每个模块统一按 `权限设计`、`相关逻辑`、`相关接口` 三部分描述。`相关接口` 中以 **endpoint / entrypoint 名称优先** 组织；每个 endpoint 下再分别说明 `Web / API / MCP`。

### 用户 User

* 权限设计：
  * 匿名访客：可以浏览所有公开信息，再进入登录流程前无法进行下一步操作。
  * 普通用户：关注班级、管理待办、标记作业完成状态、导出 iCal、固定常用链接、保存校车偏好，发表评论、回复、反应和上传附件，管理个人资料与 OAuth 连接。
  * 管理员：审核评论、维护描述、管理用户、封禁、管理 OAuth 客户端、维护校车数据，处理用户内容与平台安全问题。
  * 外部客户端 / Agent：只能在 OAuth 授权后访问受限能力，不默认继承管理员权限；同一抽象 endpoint 的 REST 与 MCP 在字段和权限上保持一致。
* 相关逻辑：
  * 登录方式支持 USTC、GitHub、Google；出于安全和维护成本考虑，不考虑自建账户密码登录。
  * 新用户首次登录时，如果未设置姓名或用户名，需要先完成欢迎流程。
  * 登录成功后应尽量跳转回原尝试访问页面；没有来源页时返回首页。
  * 公开身份默认以姓名或用户名表达，不以内部标识作为主信息。
* 相关接口：
  * 登录入口：
    * Web：
      * `/signin`
      * 集中展示 OAuth 登录入口。
    * API：
      * 由认证路由承接登录与会话。
    * MCP：
      * 不提供登录能力。
  * 首次登录与欢迎页：
    * Web：
      * `/welcome`
      * 欢迎页只处理补齐资料，不混入其他个人化设置。
      * 用户名要求保持简短且可公开展示。
    * API：
      * 当前不单独暴露欢迎页写入接口。
    * MCP：
      * 不提供对应写入能力。
  * 登录后跳转：
    * Web：
      * 登录成功后应尽量回到原尝试访问页面。
      * 没有明确来源时回首页。
    * API：
      * 当前没有单独的“登录跳转”接口。
    * MCP：
      * 不适用。
  * 公开主页与个人资料：
    * Web：
      * `/u/$username`
      * `/u/id/$uid`
      * 常规公开主页展示头像、昵称或姓名、`@username`、加入时间。
      * 贡献概览展示关注班级数、评论数、上传数、创建作业数、近一年贡献图。
      * `/u/id/$uid` 是例外入口，可以额外展示用户 ID。
    * API：
      * `/api/me`
      * 返回已认证用户的核心资料字段（id、email、name、image、username、isAdmin）。
      * 当前不单独暴露其他用户的公开主页接口。
    * MCP：
      * `get_my_profile`
      * 返回登录用户自己的核心资料字段。
  * 设置中心：
    * Web：
      * `/settings?tab=profile`
      * `/settings?tab=accounts`
      * `/settings?tab=content`
      * `/settings?tab=danger`
      * `profile`：编辑姓名、用户名、头像。
      * `accounts`：查看和管理已连接的 OAuth 账户；尝试断开最后一个可登录账户时必须报错。
      * `content`：当前只提供内容入口卡片，不是完整的评论 / 上传设置页。
      * `danger`：删除账户；删除属于高风险操作，需要输入固定确认词 `DELETE`。
      * `/settings/profile` 与 `/settings/accounts` 当前会重定向到对应 tab。
      * `/settings/comments` 与 `/settings/uploads` 当前会重定向回首页，不应当作稳定设置入口文档化。
    * API：
      * 当前没有单独的设置中心聚合接口。
    * MCP：
      * 不提供账户连接管理或账户删除能力。

### 学期 Semester

* 权限设计：
  * 匿名访客、普通用户、管理员：都可以读取学期信息。
  * 普通用户：不能修改学期数据。
  * 管理员：不通过普通页面直接改写学期事实。
  * 外部客户端 / Agent：只能读取现有学期信息，不拥有额外写权限。
* 相关逻辑：
  * 学期是课程、班级、课表、考试的组织维度。
  * 当前学期必须来自明确业务规则，不能按自然年份粗略推断。
  * 学期在筛选、分组标题、详情基础信息、跨学期浏览中都应清晰可见。
* 相关接口：
  * 学期列表：
    * 模型引用：
      * [SemesterSummary](#model-semestersummary)
    * Web：
      * 课程、班级、首页与筛选场景消费 `semester.nameCn` 与 `semester.id`。
      * 学期在当前项目中作为实际展示与消歧字段出现。
    * API：
      * `/api/semesters`
      * 返回 `PaginatedResponse<SemesterSummary>`。
    * MCP：
      * `list_semesters`
      * 返回分页学期列表，字段与 `SemesterSummary` 对齐。
  * 当前学期：
    * 模型引用：
      * [SemesterSummary](#model-semestersummary)
    * Web：
      * 首页与日历逻辑消费当前学期对象，不额外显示单独“当前学期详情页”。
    * API：
      * `/api/semesters/current`
      * 返回单个 `SemesterSummary` 或 404。
    * MCP：
      * `get_current_semester`
      * 返回 `{ found, semester }`。

### 课程 Course

* 权限设计：
  * 匿名访客、普通用户、管理员：都可以浏览课程。
  * 普通用户：不能修改课程事实数据。
  * 管理员：不通过普通页面直接改写课程事实。
  * 外部客户端 / Agent：可读取课程搜索与详情能力。
* 相关逻辑：
  * 课程是稳定课程实体，不指代某学期的具体开课实例。
  * `jwId` 仅用于 URL、API、MCP 和后台逻辑，不应在普通课程 UI 中直接展示。
* 相关接口：
  * 课程列表与筛选：
    * 界面引用：
      * [UI: List Table](#ui-list-table)
    * 模型引用：
      * [CourseSummary](#model-coursesummary)
    * Web：
      * `/courses`
      * 第一视觉列使用 `course.namePrimary`，次行使用 `course.nameSecondary`。
      * 结构化列展示 `course.code`、`course.educationLevel?.namePrimary`、`course.category?.namePrimary`、`course.classType?.namePrimary`。
      * 支持按课程名、英文名、课程代码搜索。
      * 支持按类别、层次、类型筛选。
    * API：
      * `/api/courses`
      * 返回 `PaginatedResponse<CourseSummary>`。
    * MCP：
      * `search_courses`
      * 返回 `courses[]`，每项字段与 `CourseSummary` 对齐。
  * 课程详情：
    * 界面引用：
      * [UI: Detail Hero](#ui-detail-hero)
      * [UI: Context Tabs](#ui-context-tabs)
      * [UI: Basic Info Card](#ui-basic-info-card)
    * 模型引用：
      * [CourseDetail](#model-coursedetail)
    * Web：
      * `/courses/[jwId]`
      * `h1` 使用 `course.namePrimary`，副标题使用 `course.nameSecondary`。
      * breadcrumb 当前项显示 `course.code`。
      * 基础信息卡展示 `course.code`、`course.educationLevel?.namePrimary`、`course.category?.namePrimary`、`course.classType?.namePrimary`。
      * 下属班级表展示 `course.sections[].semester?.nameCn`、`course.sections[].code`、`course.sections[].teachers[].namePrimary`、`course.sections[].campus?.namePrimary`、`course.sections[].stdCount`、`course.sections[].limitCount`。
      * 评论与描述位于详情页上下文中。
    * API：
      * `/api/courses/[jwId]`
      * 返回 `CourseDetail`。
    * MCP：
      * `get_course_by_jw_id`
      * 返回 `{ found, course }`，其中 `course` 与 `CourseDetail` 对齐。

### 班级 Section

* 权限设计：
  * 匿名访客、普通用户、管理员：都可以浏览班级公开信息。
  * 普通用户：可以围绕班级执行关注、作业、评论、描述等协作动作，但不能修改班级事实数据。
  * 管理员：不通过普通页面直接改写教务班级事实。
  * 外部客户端 / Agent：可读取班级信息，并通过 OAuth 授权的 REST / MCP 入口管理自己的班级相关个人状态。
* 相关逻辑：
  * 班级是某课程在某学期的具体教学班。
  * 页面涉及关注动作时，必须明确说明这不是正式教务系统选课。
  * `jwId` 仅用于路由和接口，不应在普通班级 UI 中直接展示。
* 相关接口：
  * 班级列表与筛选：
    * 界面引用：
      * [UI: List Table](#ui-list-table)
    * 模型引用：
      * [SectionSummary](#model-sectionsummary)
    * Web：
      * `/sections`
      * 当前项目中班级列表的主展示字段不是独立的 `section.name`，而是 `section.course.namePrimary`。
      * 结构化列展示 `section.semester?.nameCn`、`section.code`、`section.teachers[].namePrimary`、`section.credits`、`section.stdCount`、`section.limitCount`、`section.campus?.namePrimary`。
      * 支持搜索、学期筛选、清除筛选、进入详情。
    * API：
      * `/api/sections`
      * 返回 `PaginatedResponse<SectionSummary>`。
    * MCP：
      * `search_sections`
      * 返回分页班级结果，字段与 `SectionSummary` 对齐。
  * 班级详情：
    * 界面引用：
      * [UI: Detail Hero](#ui-detail-hero)
      * [UI: Context Tabs](#ui-context-tabs)
      * [UI: Basic Info Card](#ui-basic-info-card)
    * 模型引用：
      * [SectionDetail](#model-sectiondetail)
    * Web：
      * `/sections/[jwId]`
      * `h1` 使用 `section.course.namePrimary`，不是独立的 `section.name`。
      * 副标题展示 `section.course.nameSecondary` 与“非正式选课”提醒。
      * breadcrumb 当前项显示 `section.code`。
      * 基础信息区展示 `section.semester?.nameCn`、`section.code`、`section.campus?.namePrimary`、`section.credits`、`section.teachLanguage?.namePrimary`、`section.examMode?.namePrimary`、`section.openDepartment?.namePrimary`。
      * 主内容区以作业、日历、评论三组标签承载上下文。
      * 侧栏展示描述、基础信息、其他教学班与迷你月历。
    * API：
      * `/api/sections/[jwId]`
      * 返回 `SectionDetail`。
    * MCP：
      * `get_section_by_jw_id`
      * 返回 `{ found, section }`，其中 `section` 与 `SectionDetail` 对齐。
  * 班级 iCal：
    * 界面引用：
      * [UI: Calendar Export Dialog](#ui-calendar-export-dialog)
    * Web：
      * 班级详情页日历入口提供单班级 iCal。
    * API：
      * `/api/sections/[jwId]/calendar.ics`
      * 返回 `text/calendar`，内容来自当前班级的课表与考试。
    * MCP：
      * `get_section_calendar_subscription`
      * 返回单班级 iCal 链接与使用说明。

### 教师 Teacher

* 权限设计：
  * 匿名访客、普通用户、管理员：都可以浏览教师信息。
  * 普通用户：不能修改教师事实数据。
  * 管理员：不通过普通页面直接改写教师事实。
  * 外部客户端 / Agent：可以直接读取教师列表与详情，也会在课程和班级结果中间接消费教师信息。
* 相关逻辑：
  * 教师对象天然以姓名识别。
  * 班级代码在教师页仍有价值，但只在教学班列表里作为辅助字段出现。
* 相关接口：
  * 教师列表与筛选：
    * 界面引用：
      * [UI: List Table](#ui-list-table)
    * 模型引用：
      * [TeacherSummary](#model-teachersummary)
    * Web：
      * `/teachers`
      * 第一视觉列使用 `teacher.namePrimary`，英文环境下可附带 `teacher.nameSecondary`。
      * 结构化列展示 `teacher.department?.namePrimary`、`teacher.teacherTitle?.namePrimary`、`teacher.email`、`teacher._count.sections`。
      * 支持按姓名、英文名、教师代码搜索。
      * 支持院系筛选与分页。
    * API：
      * `/api/teachers`
      * 返回 `PaginatedResponse<TeacherSummary>`。
    * MCP：
      * `search_teachers`
      * 返回分页教师结果，字段与 `TeacherSummary` 对齐。
  * 教师详情：
    * 界面引用：
      * [UI: Detail Hero](#ui-detail-hero)
      * [UI: Context Tabs](#ui-context-tabs)
      * [UI: Basic Info Card](#ui-basic-info-card)
    * 模型引用：
      * [TeacherDetail](#model-teacherdetail)
    * Web：
      * `/teachers/[id]`
      * `h1` 使用 `teacher.namePrimary`，英文环境下可附带 `teacher.nameSecondary`。
      * 基础信息区展示 `teacher.department?.namePrimary`、`teacher.teacherTitle?.namePrimary`、`teacher.email`、`teacher.telephone`、`teacher.mobile`、`teacher.address`。
      * 相关班级表展示 `teacher.sections[].semester?.nameCn`、`teacher.sections[].course.namePrimary`、`teacher.sections[].code`、`teacher.sections[].credits`。
      * 评论与描述位于详情页上下文中。
    * API：
      * `/api/teachers/[id]`
      * 返回 `TeacherDetail`。
    * MCP：
      * `get_teacher_by_id`
      * 返回 `{ found, teacher }`，其中 `teacher` 与 `TeacherDetail` 对齐。

### 班级订阅 Subscription

* 权限设计：
  * 匿名访客：可以看到关注入口，但不能直接建立订阅关系。
  * 普通用户：只能管理自己的班级订阅关系。
  * 管理员：不通过普通页面代替用户管理个人订阅关系。
  * 外部客户端 / Agent：在 OAuth 授权后可以管理当前用户自己的订阅关系；REST 与 MCP 都应承接同语义操作。
* 相关逻辑：
  * 文案上可以使用“订阅班级”或“关注班级”，不得写成“选课”。
  * 订阅关系只属于当前用户，决定首页、日历、作业、考试的展示范围。
* 相关接口：
  * 班级详情关注入口：
    * 界面引用：
      * [UI: Detail Hero](#ui-detail-hero)
    * 模型引用：
      * [CalendarSubscription](#model-calendarsubscription)
    * Web：
      * `/sections/[jwId]`
      * 班级详情页中的单个关注 / 取关是轻量个人状态切换，立即生效，不弹出二次确认。
    * API：
      * 当前没有单独的“单个关注 / 取关” REST route。
      * 页面行为通过服务端动作承接，返回结果仍收敛到当前用户的订阅状态。
    * MCP：
      * `subscribe_section_by_jw_id`
      * `unsubscribe_section_by_jw_id`
      * 返回 `success` 与 `subscription`，其中 `subscription.sections[]` 使用 [SectionSummary](#model-sectionsummary)。
  * 课程代码批量匹配与批量关注：
    * 模型引用：
      * [SectionSummary](#model-sectionsummary)
      * [CalendarSubscription](#model-calendarsubscription)
    * Web：
      * 首页空状态
      * `/?tab=subscriptions`
      * 批量导入结果必须区分成功项、失败项、待确认项。
      * 用户确认后才建立关注关系。
    * API：
      * `/api/sections/match-codes`
      * `/api/calendar-subscriptions`
      * `/api/sections/match-codes` 返回学期、`matchedCodes`、`unmatchedCodes` 与 `sections[]`。
      * `/api/calendar-subscriptions` 返回 `subscription`，其中 `sections[]` 是用户新的关注班级集合。
    * MCP：
      * `match_section_codes`
      * `subscribe_my_sections_by_codes`
      * `match_section_codes` 返回学期、匹配结果和 `sections[]`。
      * `subscribe_my_sections_by_codes` 返回 `matchedCodes`、`unmatchedCodes`、`addedCount` 与 `subscription`。

### 个人日历订阅 iCal

* 权限设计：
  * 匿名访客：可以从公开班级详情复制单班级 iCal 链接。
  * 普通用户：可以复制自己的个人订阅 iCal 链接。
  * 管理员：没有额外专属 iCal 能力。
  * 外部客户端 / Agent：可在授权后读取当前用户的个人日历订阅信息；REST 与 MCP 都应返回同一订阅 feed 信息与说明。
* 相关逻辑：
  * iCal 链接应以“可复制链接”的方式呈现，而不是要求用户手动拼接。
  * iCal 是导出 / 订阅能力，不应承载第二套业务模型。
* 相关接口：
  * 班级详情日历弹窗：
    * 界面引用：
      * [UI: Calendar Export Dialog](#ui-calendar-export-dialog)
    * Web：
      * `/sections/[jwId]`
      * 同时暴露单班级 iCal 和个人订阅 iCal；后者需要登录。
    * API：
      * `/api/sections/[jwId]/calendar.ics`
      * 返回该班级课表与考试合成的 `text/calendar`。
    * MCP：
      * 不适用。
  * 当前用户个人日历订阅：
    * 界面引用：
      * [UI: Calendar Export Dialog](#ui-calendar-export-dialog)
    * 模型引用：
      * [CalendarSubscription](#model-calendarsubscription)
    * Web：
      * `/?tab=calendar`
      * 以可复制链接方式展示个人订阅地址。
    * API：
      * `/api/users/[userId]/calendar.ics`
      * `/api/calendar-subscriptions/current`
      * 当前会返回已关注班级明细、个人日历 feed 路径、完整 feed URL 与说明文案。
    * MCP：
      * `get_my_calendar_subscription`
      * 返回 `subscription.userId`、`subscription.sections[]`、`subscription.calendarPath`、`subscription.calendarUrl`、`subscription.note`。
  * 多班级 iCal 导出：
    * Web：
      * 当前没有稳定的独立页面入口；该能力更像底层导出接口。
    * API：
      * `/api/sections/calendar.ics`
      * 按 `sectionIds` 生成多班级 iCal。
    * MCP：
      * 不适用。

### 已关注班级列表 Subscribed Sections

* 权限设计：
  * 匿名访客：不能查看自己的已关注班级列表。
  * 普通用户：只能查看和管理自己的已关注班级列表。
  * 管理员：不通过普通页面查看或编辑他人的订阅列表。
  * 外部客户端 / Agent：可以通过 REST 与 MCP 读取和管理与 Web 同语义的已关注班级列表数据。
* 相关逻辑：
  * 列表按学期分组，而不是单一长列表。
  * 在“已订阅上下文”中，用户管理的是具体班级关系，因此班级代码会被有意提前。
* 相关接口：
  * 已关注班级 tab：
    * 界面引用：
      * [UI: List Table](#ui-list-table)
    * 模型引用：
      * [CalendarSubscription](#model-calendarsubscription)
      * [SectionSummary](#model-sectionsummary)
    * Web：
      * `/?tab=subscriptions`
      * 按学期分组的班级表。
      * 行内字段当前保留班级代码、课程名、教师、学分。
      * 空状态提供搜索班级、浏览课程、批量导入入口。
      * 退订动作采用轻量的两步 armed 按钮，而不是模态框确认。
    * API：
      * `/api/calendar-subscriptions/current`
      * 当前返回当前用户的已关注班级明细与个人订阅 feed 信息，可直接支撑已关注班级列表与个人日历订阅入口。
    * MCP：
      * `list_my_subscribed_sections`
      * `get_my_calendar_subscription`
      * `list_my_subscribed_sections` 返回 `sections[]` 与 `note`。
      * `get_my_calendar_subscription` 在同一抽象入口上补充 `calendarPath` 与 `calendarUrl`。

### 课表 Schedule

* 权限设计：
  * 匿名访客、普通用户、管理员：都可以读取公开课表信息。
  * 普通用户：不能修改课表事实数据。
  * 管理员：不通过普通页面直接改写课表事实。
  * 外部客户端 / Agent：可读取指定班级课表；当前用户课表聚合主要通过 MCP 暴露，公开课表检索通过 REST 与 MCP 暴露。
* 相关逻辑：
  * 课表指班级的上课时间、地点和周次。
  * 班级详情页中的课表不被当作孤立表格，而是理解班级上下文的重要入口。
  * 个人日历会整合已关注班级课表、作业截止时间、考试时间与个人待办截止时间。
* 相关接口：
  * 当前用户课表数据：
    * 模型引用：
      * [ScheduleEntry](#model-scheduleentry)
    * Web：
      * `/?tab=calendar`
      * 首页日历消费已关注班级的课表数据。
    * API：
      * 当前没有单独的“当前用户课表” REST 聚合接口。
    * MCP：
      * `list_my_schedules`
      * 返回 `schedules[]`，每项包含 `date`、`weekday`、`startTime`、`endTime`、`section.course.namePrimary`、`section.code`、`room`、`teachers[]`、`scheduleGroup`。
  * 公开课表查询接口：
    * 模型引用：
      * [ScheduleEntry](#model-scheduleentry)
    * Web：
      * 当前没有单独的公开课表页面直接调用这个 endpoint；页面更多通过服务端查询装配数据。
    * API：
      * `/api/schedules`
      * 支持按班级、教师、教室、日期范围、星期筛选公开课表。
      * 返回 `PaginatedResponse<ScheduleEntry>`。
    * MCP：
      * `query_schedules`
      * 返回公开课表结果，字段与 [ScheduleEntry](#model-scheduleentry) 对齐。
  * 指定班级课表数据：
    * 模型引用：
      * [ScheduleEntry](#model-scheduleentry)
    * Web：
      * `/sections/[jwId]`
      * 班级详情页日历标签消费该班级的课表与考试数据。
    * API：
      * `/api/sections/[jwId]/schedules`
      * `/api/sections/[jwId]/schedule-groups`
      * `/api/sections/[jwId]/schedules` 返回该班级的 `ScheduleEntry[]` 简化变体。
      * `/api/sections/[jwId]/schedule-groups` 返回按组聚合的节次信息。
    * MCP：
      * `list_schedules_by_section`
      * `get_my_7days_timeline`
      * `list_schedules_by_section` 返回单班级课表。
      * `get_my_7days_timeline` 将课表作为统一事件流中的 `schedule` 类型返回。

### 日历视图与事件卡片 Calendar

* 权限设计：
  * 匿名访客：可以浏览公开班级详情中的日历信息。
  * 普通用户：可以浏览个人日历视图。
  * 管理员：没有独立于普通用户的特殊日历视图。
  * 外部客户端 / Agent：可通过 OAuth REST 与 MCP 读取同语义时间线信息。
* 相关逻辑：
  * 当前同时提供学期、月、周三种视图。
  * 周视图以周日为一周开始。
  * 日历事件卡片统一承载课程、考试、作业和待办。
* 相关接口：
  * 个人日历视图：
    * 模型引用：
      * [CalendarEvent](#model-calendarevent)
      * [ScheduleEntry](#model-scheduleentry)
      * [HomeworkItem](#model-homeworkitem)
      * [ExamEntry](#model-examentry)
      * [TodoItem](#model-todoitem)
    * Web：
      * `/?tab=calendar`
      * 提供学期视图、月视图、周视图。
    * API：
      * 当前没有单独的统一日历聚合接口。
    * MCP：
      * `list_my_calendar_events`
      * `get_my_7days_timeline`
      * `list_my_schedules`
      * `list_my_exams`
      * 其中 `list_my_calendar_events` 按日期范围统一返回课程、考试、作业和待办事件，直接对应个人日历视图。
      * `events[]` 中每项都有 `type`、`at`、`payload`；`payload` 根据 `type` 分别对应 [ScheduleEntry](#model-scheduleentry)、[HomeworkItem](#model-homeworkitem)、[ExamEntry](#model-examentry)、[TodoItem](#model-todoitem)。
  * 班级详情日历视图：
    * 界面引用：
      * [UI: Context Tabs](#ui-context-tabs)
    * Web：
      * `/sections/[jwId]`
      * 当前实现将课表与考试合并在同一个日历标签页中，而不是拆成独立考试标签页。
    * API：
      * 当前通过课表、考试和 iCal 路径组合支持该视图。
    * MCP：
      * 不适用。
  * 事件卡片：
    * Web：
      * 紧凑卡片优先展示标题与时间。
      * 默认不展开第二行地点；地点、教师、考试批次等信息进入 popover / details。
      * 卡片可跳转到相关班级、作业、考试或首页标签页。
      * 首页日历和班级日历尽量复用同一套卡片、hover / popover 与跳转行为。
    * API：
      * 不直接暴露“卡片”概念，只暴露结构化事件数据。
    * MCP：
      * 不直接暴露“卡片”概念，只暴露结构化结果。

### 作业 Homework

* 权限设计：
  * 匿名访客：可以读取公开班级下的作业信息，但不能创建、更新或删除。
  * 普通用户：登录且未封禁时可以创建和更新作业；删除权限限于创建者与管理员；每个用户只能管理自己的作业完成状态。
  * 管理员：可以删除作业并参与治理。
  * 外部客户端 / Agent：在授权后可读取、创建、更新作业，并设置当前用户的完成状态；当前 REST 与 MCP 都提供对应能力。
* 相关逻辑：
  * 作业依附于班级，不是用户个人待办。
  * 创建作业不强制要求用户先关注该班级。
  * 作业本体和作业完成状态严格分离，避免“我完成了”变成“作业被改了”。
* 相关接口：
  * 跨班级作业汇总：
    * 模型引用：
      * [HomeworkItem](#model-homeworkitem)
    * Web：
      * `/?tab=homeworks`
      * 作业汇总页负责扫描。
      * 作业卡片优先展示截止时间、标题、课程名。
      * 班级代码和内部 ID 默认不进入主区域。
    * API：
      * 当前没有单独的“当前用户跨班级作业汇总” REST endpoint。
    * MCP：
      * `list_my_homeworks`
      * 返回 `homeworks[]`，每项包含 `title`、`submissionDueAt`、`section.course.namePrimary`、`section.code`、`description`、`completion`。
  * 班级详情作业标签：
    * 界面引用：
      * [UI: Context Tabs](#ui-context-tabs)
    * 模型引用：
      * [HomeworkItem](#model-homeworkitem)
    * Web：
      * `/sections/[jwId]`
      * 提供完整的创建、编辑、删除与描述维护入口。
      * 删除作业属于高风险操作，需要二次确认。
      * 作业描述与作业主体一并维护；当前至少保留最近更新时间。
    * API：
      * `/api/homeworks`
      * `/api/homeworks/[id]`
      * `/api/homeworks` 返回 `viewer`、`homeworks[]`、`auditLogs[]`。
      * `homeworks[]` 使用 [HomeworkItem](#model-homeworkitem)。
    * MCP：
      * `list_homeworks_by_section`
      * `create_homework_on_section`
      * `update_homework_on_section`
  * 作业治理接口：
    * Web：
      * 当前没有独立的作业治理页面；管理员删除更多通过治理接口完成。
    * API：
      * `/api/admin/homeworks`
      * `/api/admin/homeworks/[id]`
    * MCP：
      * 当前不提供管理员作业工具。
  * 作业完成状态：
    * 模型引用：
      * [HomeworkItem](#model-homeworkitem)
    * Web：
      * 首页、作业汇总页与班级详情都可切换当前用户的完成状态。
    * API：
      * `/api/homeworks/[id]/completion`
      * 返回 `completed` 与 `completedAt`。
    * MCP：
      * `set_my_homework_completion`
      * 返回 `completion.homeworkId`、`completion.completed`、`completion.completedAt`。

### 待办 Todo

* 权限设计：
  * 匿名访客：不能读取或写入个人待办。
  * 普通用户：只能管理自己的待办。
  * 管理员：没有独立管理他人待办的普通页面能力。
  * 外部客户端 / Agent：在授权后只能读写当前用户自己的待办；当前 REST 与 MCP 都提供对应能力。
* 相关逻辑：
  * 待办是纯个人对象，不与班级绑定。
  * 只有未完成且有截止时间的待办进入日历。
  * 已完成待办保留历史，但不再占据紧急信息区域。
* 相关接口：
  * 待办列表与筛选：
    * 模型引用：
      * [TodoItem](#model-todoitem)
    * Web：
      * `/?tab=todos`
      * 过滤维度包括全部、未完成、已完成。
      * 卡片主展示待办标题，次级展示优先级和截止时间。
    * API：
      * `/api/todos`
      * `/api/todos/[id]`
      * `/api/todos` 返回 `todos[]`，每项包含 `id`、`title`、`content`、`completed`、`priority`、`dueAt`、`createdAt`、`updatedAt`。
      * `/api/todos/[id]` 承接更新与删除。
    * MCP：
      * `list_my_todos`
      * 返回 `todos[]`，字段与 [TodoItem](#model-todoitem) 对齐。
  * 待办编辑 Sheet：
    * 模型引用：
      * [TodoItem](#model-todoitem)
    * Web：
      * `/?tab=todos`
      * `/?tab=overview`
      * 待办通过 Sheet 进行创建与编辑。
      * 当前删除待办不使用 destructive confirm dialog。
    * API：
      * `/api/todos`
      * `/api/todos/[id]`
      * `POST /api/todos` 返回新待办 `id`。
    * MCP：
      * `create_my_todo`
      * `update_my_todo`
      * `delete_my_todo`
      * `create_my_todo` 返回 `success` 与 `id`。
      * `update_my_todo`、`delete_my_todo` 返回 `success`。

### 考试 Exam

* 权限设计：
  * 匿名访客、普通用户、管理员：都可以读取考试信息。
  * 普通用户：不能修改考试事实数据。
  * 管理员：通过后台或导入流程维护考试数据，而不是普通页面直接编辑。
  * 外部客户端 / Agent：在授权后可读取当前用户相关考试；当前该能力主要通过 MCP 暴露。
* 相关逻辑：
  * 考试依附于班级，是高优先级时间事件。
  * 考试保持只读，不提供普通用户编辑入口。
  * 跨学期浏览考试时必须显式展示学期。
* 相关接口：
  * 跨班级考试列表：
    * 模型引用：
      * [ExamEntry](#model-examentry)
    * Web：
      * `/?tab=exams`
      * 首页考试 tab 提供跨班级考试列表。
      * 卡片主展示课程名，次展示考场、日期时间、考试方式。
      * 班级代码只在歧义场景提升优先级。
    * API：
      * 当前不单独暴露考试列表接口。
    * MCP：
      * `list_my_exams`
      * 返回 `exams[]`，每项包含 `section.course.namePrimary`、`section.code`、`section.semester?.nameCn`、`examDate`、`startTime`、`endTime`、`examBatch`、`examRooms[]`。
  * 指定班级考试信息：
    * 模型引用：
      * [ExamEntry](#model-examentry)
    * Web：
      * `/sections/[jwId]`
      * 班级详情页在日历标签和迷你月历中展示该班级考试。
    * API：
      * 当前通过现有公开教务对象与日历能力组合提供。
    * MCP：
      * `list_exams_by_section`
      * 返回单班级的 `exams[]`。

### 首页与工作台概览 Overview

* 权限设计：
  * 匿名访客：首页只看到公开的校车与常用链接视图，不进入个人概览。
  * 普通用户：首页作为个人工作台。
  * 管理员：首页的个人工作台行为与普通用户一致。
  * 外部客户端 / Agent：可读取与首页同语义的概览结果；REST 与 MCP 应返回一致的概览信息。
* 相关逻辑：
  * 首页不是目录页，而是“接下来该做什么”的决策页。
  * 首屏优先展示当前学期范围内的个人学习任务，而不是历史学期内容或完整目录信息。
  * 作业和待办按“今日截止 / 近期截止 / 全部未完成”分层；无截止时间作业不参与临近截止排序。
  * 非当前学期关注班级不得伪装成当前学习任务。
* 相关接口：
  * 已登录首页概览：
    * 模型引用：
      * [OverviewSnapshot](#model-overviewsnapshot)
    * Web：
      * `/`
      * `/?tab=overview`
      * `/?tab=calendar`
      * `/?tab=subscriptions`
      * `/?tab=exams`
      * `/?tab=homeworks`
      * `/?tab=todos`
      * `/?tab=bus`
      * `/?tab=links`
      * 展示常用链接、今日和明日课表、本周日历、未完成作业、未完成待办。
    * API：
      * 当前不单独暴露概览接口。
    * MCP：
      * `get_my_overview`
      * 返回 `user`、`overview`、`samples`。
      * `overview` 包含待办、作业、今日课表、即将到来的考试计数。
      * `samples` 包含 `dueTodos[]`、`dueHomeworks[]`、`upcomingExams[]`。
  * 未登录首页：
    * Web：
      * `/`
      * 仅保留 `bus` 与 `links` 两个公共 tab。
    * API：
      * 不适用。
    * MCP：
      * 不适用。

### 通用展示与权限 UI / Permission

* 权限设计：
  * 匿名访客：只能执行公开浏览和登录前引导动作。
  * 普通用户：不能修改课表和考试，只能管理自己的作业完成状态和待办等个人状态。
  * 管理员：拥有治理入口，但不因此改变普通详情页的信息分层逻辑。
  * 外部客户端 / Agent：可以拿到更结构化的字段，但不应因此产生第二套产品模型。
* 相关逻辑：
  * 用户首先识别的是名称，不是编号。
  * 代码、学期、编号主要承担消歧与检索职责。
  * `jwId`、数据库 `id`、其他内部标识默认不在普通 UI 中直接展示。
* 相关接口：
  * 列表页：
    * Web：
      * 列表页负责发现、筛选和消歧。
      * 必须保留足够的消歧字段。
    * API：
      * 可以返回结构化标识字段用于检索和消费。
    * MCP：
      * 可以返回结构化标识字段用于检索和消费。
  * 详情页：
    * Web：
      * 详情页负责完整上下文和对象相关操作。
      * 应展示完整上下文与协作内容。
    * API：
      * 返回详情所需结构化字段。
    * MCP：
      * 返回详情所需结构化字段。
  * 卡片：
    * Web：
      * 卡片负责快速扫描和快速处理。
      * 优先展示下一步决策所需信息。
      * 首页日历和班级日历尽量复用一致的事件卡片和跳转行为。
      * 移动端和桌面端都必须避免溢出、遮挡和隐藏关键动作。
    * API：
      * 不暴露卡片形态，只暴露数据。
    * MCP：
      * 不暴露卡片形态，只暴露数据。
  * 辅助页面：
    * Web：
      * `/mobile-app`：移动端应用引导页。
      * `/privacy`：隐私政策。
      * `/terms`：服务条款。
      * `/guides/markdown-support`：Markdown 支持说明。
    * API：
      * 不适用。
    * MCP：
      * 不适用。

### 评论 Comment

* 权限设计：
  * 匿名访客：可以阅读公开评论，但不能创建登录态评论。
  * 普通用户：可以发表、回复、反应、编辑和删除自己的评论；被封禁用户不能发表新评论。
  * 管理员：可以隐藏、删除、审核评论，并处理举报或封禁。
  * 外部客户端 / Agent：当前不提供评论读写能力。
* 相关逻辑：
  * 评论必须依附于具体对象，不提供脱离上下文的广场入口。
  * 依附对象包括课程、班级、教师、作业、班级-教师关系。
  * 支持 Markdown、数学公式、emoji、表格、回复和反应。
  * 支持公开、仅登录用户可见、匿名发表；匿名对普通用户隐藏身份，但在治理场景下对管理员可追溯。
* 相关接口：
  * 对象详情评论区：
    * Web：
      * 课程、班级、教师、作业等对象详情页中的评论区。
      * 评论与描述放在对象详情页中，而不是独立社区页。
      * 删除评论属于高风险操作，需要二次确认。
    * API：
      * `/api/comments`
      * `/api/comments/[id]`
      * `/api/comments/[id]/reactions`
    * MCP：
      * 当前不提供评论读写工具。
  * 评论治理：
    * Web：
      * `/admin/moderation`
    * API：
      * `/api/admin/comments`
      * `/api/admin/comments/[id]`
      * `/api/admin/suspensions`
      * `/api/admin/suspensions/[id]`
    * MCP：
      * 当前不提供管理员评论工具。
  * 评论辅助页面：
    * Web：
      * `/comments/[id]`
      * `/comments/guide`
      * 前者负责把单条评论重定向回原对象上下文；后者提供评论格式说明。
    * API：
      * 不适用。
    * MCP：
      * 不适用。

### 描述 Description

* 权限设计：
  * 匿名访客：可以阅读公开描述。
  * 普通用户：登录且未封禁时可以维护描述。
  * 管理员：可以在后台审核和维护描述。
  * 外部客户端 / Agent：当前不提供通用描述工具。
* 相关逻辑：
  * 描述是对象上的 Markdown 补充说明，不等同于评论区观点。
  * 依附对象包括课程、班级、教师、作业等。
  * 当描述与评论中的个人经验冲突时，描述优先视为平台维护信息。
* 相关接口：
  * 对象详情描述区：
    * Web：
      * 课程、班级、教师、作业详情页中的描述区。
      * 描述作为对象稳定补充信息展示。
    * API：
      * `/api/descriptions`
    * MCP：
      * 当前不提供通用对象描述维护工具。
  * 描述治理：
    * Web：
      * `/admin/moderation`
    * API：
      * `/api/admin/descriptions`
    * MCP：
      * 当前不提供描述治理工具。

### 上传 Upload

* 权限设计：
  * 匿名访客：不能上传附件。
  * 普通用户：可在评论附件流程中上传；下载权限必须再次校验。
  * 管理员：当前没有单独的公开“上传管理台”。
  * 外部客户端 / Agent：当前不提供上传能力。
* 相关逻辑：
  * 上传只服务于评论附件，不是独立文件空间。
  * 上传前必须检查权限和配额。
  * Web 评论附件上传走“站内创建上传会话 -> 浏览器直传 AWS SDK 生成的 S3 兼容已签名地址 -> 站内完成确认”的三段式流程；页面 CSP 需允许当前上传后端实际使用的签名存储源，包括 AWS S3 的 virtual-hosted / path-style 地址，或通过自定义 endpoint 配置的兼容后端。
  * 存储后端按 AWS SDK S3 兼容配置运行；默认走 AWS S3，也允许通过自定义 endpoint 对接兼容后端。
  * 下载不能因拿到直链而绕过授权。
  * `/api/uploads/[id]/download` 只返回短时有效的签名下载地址重定向，不返回可长期复用的稳定对象直链。
* 相关接口：
  * 当前用户上传清单：
    * Web：
      * 当前没有独立上传管理页；评论编辑器会按需读取当前用户上传额度与历史上传记录，并从这里启动上传会话。
    * API：
      * `/api/uploads`
      * 同一路径当前同时承接“读取上传额度 / 历史记录”和“创建上传会话”两种能力。
    * MCP：
      * 当前不提供上传工具。
  * 评论附件上传：
    * Web：
      * 评论编辑器中的附件流程。
      * 不提供脱离对象上下文的独立资源浏览入口。
    * API：
      * `/api/uploads`
      * `/api/uploads/complete`
    * MCP：
      * 当前不提供上传工具。
  * 评论附件下载：
    * Web：
      * 评论附件下载入口。
    * API：
      * `/api/uploads/[id]`
      * `/api/uploads/[id]/download`
      * 当前下载实现按上传所有者校验访问权限。
    * MCP：
      * 当前不提供下载工具。

### 校车 Bus

* 权限设计：
  * 匿名访客：可以查询校车信息。
  * 普通用户：可以查询校车信息并保存偏好。
  * 管理员：可以维护校车数据。
  * 外部客户端 / Agent：可读取校车时刻表能力。
* 相关逻辑：
  * 校车是公开校园生活信息，不应把登录作为前置条件。
  * 时刻表区分工作日和周末，并默认采用当前日期类型。
  * 仪表盘优先回答“下一班怎么走”，地图页承担空间理解任务。
* 相关接口：
  * 仪表盘校车页：
    * Web：
      * `/?tab=bus`
      * 仪表盘路线与班次视图支持按校区过滤、切换是否显示已发车班次。
    * API：
      * `/api/bus`
      * `/api/bus/preferences`
    * MCP：
      * `query_bus_timetable`
      * `list_bus_routes`
      * `get_bus_route_timetable`
  * 路线地图页：
    * Web：
      * `/bus-map`
      * 校车路线地图。
    * API：
      * 当前没有单独的地图 REST 入口。
    * MCP：
      * 不提供地图视图能力。

### 常用链接 Dashboard Link

* 权限设计：
  * 匿名访客：可以浏览常用链接，但不能固定。
  * 普通用户：可以固定、取消固定并记录点击。
  * 管理员：没有独立于普通用户的专用链接管理界面。
  * 外部客户端 / Agent：当前不提供常用链接管理能力。
* 相关逻辑：
  * 常用链接是导航能力，不是内容流。
  * 搜索支持中文、拼音和空白字符容错。
  * 链接用于导航，按钮用于动作。
  * 当前最多固定 5 个链接；超出时会挤掉最早固定的链接。
* 相关接口：
  * 链接浏览与搜索：
    * Web：
      * `/?tab=links`
      * `/?tab=overview`
      * 首页提供常用校内外系统链接；未登录用户只能浏览。
    * API：
      * 当前没有单独的“搜索链接”接口。
    * MCP：
      * 当前不提供常用链接工具。
  * 固定与点击：
    * Web：
      * 已登录用户可以固定、取消固定并记录点击。
    * API：
      * `/api/dashboard-links/pin`
      * `/api/dashboard-links/visit`
    * MCP：
      * 当前不提供对应能力。

### 管理后台 Admin

* 权限设计：
  * 匿名访客：不能访问管理后台。
  * 普通用户：不能访问管理后台。
  * 管理员：可以访问审核、用户、OAuth、校车等治理页面。
  * 外部客户端 / Agent：当前不提供管理员工具。
* 相关逻辑：
  * 管理后台按治理职责分区，而不是把所有管理动作堆在一个页面。
  * 评论与描述治理当前集中在 moderation 页面。
  * 删除、封禁、隐藏等高风险管理动作必须有明确反馈。
* 相关接口：
  * 管理首页：
    * Web：
      * `/admin`
      * 入口聚合页。
    * API：
      * 不适用。
    * MCP：
      * 不适用。
  * 审核页：
    * Web：
      * `/admin/moderation`
      * 同时承载评论与描述治理。
    * API：
      * `/api/admin/comments`
      * `/api/admin/comments/[id]`
      * `/api/admin/descriptions`
      * `/api/admin/suspensions`
      * `/api/admin/suspensions/[id]`
      * `/api/admin/homeworks`
      * `/api/admin/homeworks/[id]`
    * MCP：
      * 当前不提供独立管理员工具。
  * 用户管理页：
    * Web：
      * `/admin/users`
    * API：
      * `/api/admin/users`
      * `/api/admin/users/[id]`
    * MCP：
      * 当前不提供独立管理员工具。
  * OAuth 客户端管理页：
    * Web：
      * `/admin/oauth`
      * 后台首页应先说明客户端模式：第一方 / 内部应用优先创建机密客户端；CLI、原生应用与 MCP 工具优先创建公共 PKCE 客户端。
      * 页面应把“如何选客户端类型”和“当前已有客户端概览”分开展示，优先降低管理员的理解成本。
    * API：
      * 当前没有独立 REST 管理接口。
      * 后台创建与删除通过服务端 action 承接。
    * MCP：
      * 当前不提供独立管理员工具。
  * 校车管理页：
    * Web：
      * `/admin/bus`
    * API：
      * 当前没有独立 admin REST 管理接口。
      * 版本导入、启用、删除通过服务端 action 承接。
    * MCP：
      * 当前不提供独立管理员工具。

### OAuth 授权 OAuth

* 权限设计：
  * 匿名访客：访问授权页时会先被引导登录。
  * 普通用户：只能同意或拒绝第三方客户端的授权请求。
  * 管理员：可以在后台管理 OAuth 客户端。
  * 外部客户端 / Agent：通过标准授权流程获得 token 后访问受限能力。
* 相关逻辑：
  * 授权页必须清楚展示应用名称、请求权限、同意操作、拒绝操作。
  * 用户看到的是“这个应用要什么、我是否允许”，而不是技术协议细节。
  * 动态客户端注册由 Better Auth OAuth provider 的标准 `/oauth2/register` 路径承接；项目不再维护一套并行的手写 DCR 持久化逻辑。
  * DCR 默认 scopes、允许 scopes、public/confidential 限制与 PKCE 规则应由 Better Auth provider 配置统一决定，而不是在应用层重复实现一份近似规则。
  * 第一方 / 内部应用优先使用后台创建的 trusted OAuth 客户端；这类客户端可以跳过 consent，并在需要时进一步纳入 Better Auth provider 的 trusted / cached client 方案，而不是依赖公开 DCR。
  * 公共 MCP / CLI / 原生客户端走 public + PKCE 模式；后台文案与分组应显式把 trusted first-party 与 external/public 区分开，降低管理员误配概率。
  * 后台创建客户端时，redirect URI 与客户端元数据校验应优先复用 Better Auth OAuth provider 的规则，不再维护一套本地分叉规则文案。
  * 对 public 原生客户端的 loopback redirect URI，服务端应兼容 `127.0.0.1` 与 `localhost` 的主机名别名差异，避免 DCR 注册与授权请求仅因这两种本地回环写法不同而失败；除此之外仍保持严格匹配，不放宽 path、query、scheme 或非回环主机规则。
  * 设备授权流程当前仍由项目自定义实现，因为 Better Auth 现有 device-authorization plugin 返回的是 session token，而不是本项目 OAuth bearer-token / refresh-token 语义；在 provider 原生支持 OAuth device grant 之前，不应强行替换。
  * 本地开发与不固定 hostname 的预览部署可以通过 OAuth proxy 复用生产站点已登记的 provider 回调地址；预览/本地实例与生产实例共享 proxy 加密密钥后，由生产站点完成 provider 回调并把加密后的用户资料回传给当前实例建立本地 session。
* 相关接口：
  * 授权页：
    * Web：
      * `/oauth/authorize`
      * 展示客户端名称和请求 scopes。
    * API：
      * 授权协议由认证路由承接。
    * MCP：
      * 不适用。
  * 客户端注册与发现：
    * Web：
      * `/admin/oauth`
      * 管理后台展示 OAuth 客户端管理能力。
    * API：
      * `/api/auth/.well-known/openid-configuration`
      * `/api/auth/oauth2/register`
    * MCP：
      * 不提供 OAuth 管理能力。
  * 设备授权（RFC 8628 Device Authorization Grant）：
    * Web：
      * `/oauth/device`
      * 用户在此页面输入设备码（user_code），确认后批准或拒绝设备登录请求。
      * 未登录用户访问时会先被引导到登录页，登录后自动回到设备验证页。
      * 支持通过 `verification_uri_complete` 中的 `code` 查询参数预填设备码。
    * API：
      * `POST /api/auth/oauth2/device-authorization`
      * 请求体为 `application/x-www-form-urlencoded`，参数：
        * `client_id`（必填）：已注册且未禁用的 OAuth 客户端 ID。
        * `scope`（可选）：空格分隔的权限列表；省略时使用客户端默认 scopes。
      * 返回 JSON：
        * `device_code`：设备端用于轮询 token 的高熵不透明码。
        * `user_code`：用户端输入的 8 字符码，格式 `XXXX-XXXX`。
        * `verification_uri`：用户打开的验证页面地址。
        * `verification_uri_complete`：带预填 `user_code` 的验证地址。
        * `expires_in`：设备码有效期（秒），当前为 1800。
        * `interval`：客户端最小轮询间隔（秒），当前为 5。
      * 支持 CORS（`Access-Control-Allow-Origin: *`）。
      * `POST /api/auth/oauth2/token`
      * 设备端以 `grant_type=urn:ietf:params:oauth:grant-type:device_code` 和 `device_code` 轮询此端点获取 access token。
      * 轮询期间根据状态返回 `authorization_pending`、`slow_down`、`expired_token` 或 `access_denied` 错误码。
      * `.well-known/openid-configuration` 中已包含 `device_authorization_endpoint` 和 `grant_types_supported` 中的 `urn:ietf:params:oauth:grant-type:device_code`。
    * MCP：
      * 不适用；设备授权流程在 MCP 建立连接之前完成。
  * 适用场景：
    * CLI 工具、无浏览器的设备或 headless 环境通过设备码流程完成 OAuth 授权，无需浏览器重定向回调。

### Webhook 登录（调试） Webhook Login

* 权限设计：
  * 匿名访客：不适用。
  * 普通用户：不适用。
  * 管理员：需要持有 `WEBHOOK_SECRET` 环境变量值。
  * 外部客户端 / Agent：不适用。
* 相关逻辑：
  * 仅在服务端配置了 `WEBHOOK_SECRET` 环境变量时可用；未配置时所有请求返回 403。
  * 用于生产环境调试场景下的无密码登录，不作为常规用户登录入口。
  * 通过 email 或 userId 定位目标用户，并通过 Better Auth session primitives 建立登录态；不再手写 session cookie 签名。
* 相关接口：
  * Webhook 登录：
    * Web：
      * 不适用；无对应 Web 入口。
    * API：
      * `POST /api/auth/webhook/login`
      * 请求体为 JSON：
        * `secret`（必填）：与服务端 `WEBHOOK_SECRET` 一致的密钥。
        * `email`（可选）：目标用户邮箱。
        * `userId`（可选）：目标用户 ID。
        * `email` 和 `userId` 至少提供其一。
      * 成功返回 JSON：`ok`、`userId`、`email`、`sessionToken`、`expires`。
      * 同时设置 `better-auth.session_token` cookie。
    * MCP：
      * 不适用。

### REST / OpenAPI

* 权限设计：
  * 匿名访客：可以浏览 API 文档和公开 REST 能力。
  * 普通用户：在登录态下调用自己的受限 REST 能力。
  * 管理员：通过对应管理接口调用治理能力。
  * 外部客户端 / Agent：可以调用公开 REST 能力，也可以在 OAuth 授权后调用受限 REST 与 MCP 能力；两者默认共享同一授权边界。
* 相关逻辑：
  * REST / OpenAPI 的目标是暴露与 Web 对齐的能力，而不是额外再造一层产品。
  * 公开文档帮助调用方理解现有产品能力边界，而不是引入单独的“开发者专用业务模型”。
  * 当前普通用户侧业务 REST endpoint 同时支持站内 session 与 OAuth bearer token，bearer-token 访问不再局限于 MCP。
  * 当前同一个抽象 endpoint 在 REST 与 MCP 上保持相同核心字段、状态信息和动作结果；差异主要出现在交互形态和序列化层次。
* 相关接口：
  * API 文档页：
    * Web：
      * `/api-docs`
      * Swagger 文档入口。
    * API：
      * 不适用。
    * MCP：
      * 不适用。
  * OpenAPI 文档：
    * Web：
      * `/api-docs` 页面消费该文档。
    * API：
      * `/api/openapi`
    * MCP：
      * 不适用。
  * 业务 REST 接口：
    * Web：
      * 页面行为通过各自的 `/api/*` route 调用实现。
    * API：
      * `/api/*` 下各领域 REST 接口。
      * 当前普通用户侧受保护 endpoint 同时支持站内 session 与 OAuth bearer token。
    * MCP：
      * 不适用。
  * 平台工具接口：
    * Web：
      * 不适用。
    * API：
      * `/api/metadata`：返回筛选字典（教育层次、课程类别、校区等）。
      * `/api/locale`：设置用户语言偏好 Cookie。
    * MCP：
      * 不适用。

### MCP

* 权限设计：
  * 匿名访客：不能调用需要用户上下文的 MCP 工具。
  * 普通用户：在授权后可调用个人工作台相关工具。
  * 管理员：当前不会因为管理员身份而自动获得额外 MCP 管理工具。
  * 外部客户端 / Agent：MCP 是与 REST 并列的协议入口之一，默认覆盖与 Web 对齐的能力，并共享同一 OAuth 权限边界。
* 相关逻辑：
  * MCP 默认聚焦个人学习工作台、公开查询和低风险个人状态写入能力，不默认暴露管理员能力。
  * 当前工具输出统一为文本化 JSON。
  * 输出模式分为 `summary`、`default`、`full` 三层。
  * 当前 MCP 已覆盖课程、班级、教师、学期、订阅、课表和统一日历事件等核心查询工具；评论、上传、描述治理、链接管理和管理员能力当前仍未提供对应工具。
* 相关接口：
  * 协议入口：
    * Web：
      * 当前没有单独的 MCP Web UI；文档入口仍在 `/api-docs`。
    * API：
      * `/api/mcp`
    * MCP：
      * 通过该入口承接所有工具调用。
  * 工具分组：
    * Web：
      * 不适用。
    * API：
      * 不适用。
    * MCP：
      * Profile / Todo
      * Course / Section
      * Calendar / Timeline
      * Homework / Exam / Schedule
      * Bus
  * 当前已提供的 MCP 工具：
    * Web：
      * 不适用。
    * API：
      * 不适用。
    * MCP：
      * `get_my_profile`
      * `list_my_todos`
      * `create_my_todo`
      * `update_my_todo`
      * `delete_my_todo`
      * `list_my_homeworks`
      * `set_my_homework_completion`
      * `list_my_schedules`
      * `list_my_exams`
      * `get_my_overview`
      * `get_my_7days_timeline`
      * `list_semesters`
      * `get_current_semester`
      * `search_courses`
      * `get_course_by_jw_id`
      * `search_sections`
      * `get_section_by_jw_id`
      * `search_teachers`
      * `get_teacher_by_id`
      * `match_section_codes`
      * `get_my_calendar_subscription`
      * `subscribe_my_sections_by_codes`
      * `subscribe_section_by_jw_id`
      * `unsubscribe_section_by_jw_id`
      * `list_my_subscribed_sections`
      * `get_section_calendar_subscription`
      * `list_homeworks_by_section`
      * `create_homework_on_section`
      * `update_homework_on_section`
      * `list_schedules_by_section`
      * `list_exams_by_section`
      * `query_schedules`
      * `list_my_calendar_events`
      * `query_bus_timetable`
      * `list_bus_routes`
      * `get_bus_route_timetable`
  * 当前未提供的 MCP 工具：
    * Web：
      * 不适用。
    * API：
      * 不适用。
    * MCP：
      * `get_public_user_profile`
      * `list_comments`
      * `create_comment`
      * `update_comment`
      * `delete_comment`
      * `react_to_comment`
      * `list_descriptions`
      * `upsert_description`
      * `get_my_uploads`
      * `create_upload_session`
      * `complete_upload`
      * `get_upload_download`
      * `search_dashboard_links`
      * `pin_dashboard_link`
      * `unpin_dashboard_link`
      * `record_dashboard_link_visit`

### 权限与可见性补充 Content / Security

* 权限设计：
  * 匿名评论：在用户侧不暴露真实身份，在管理员审核和安全处理场景下可追溯。
  * 上传与下载：都必须经过权限校验。
  * 高风险操作：删除、封禁、隐藏必须有明确反馈。
* 相关逻辑：
  * 当前匿名能力与可追溯能力同时存在，不是二选一设计。
  * 上传和下载都要做权限校验，安全边界不能只放在上传入口。
* 相关接口：
  * 匿名评论可见性：
    * Web：
      * 普通用户侧匿名，治理侧可追溯。
    * API：
      * 通过评论与管理接口共同实现。
    * MCP：
      * 当前不提供评论工具。
  * 上传 / 下载权限：
    * Web：
      * 评论附件上传与下载都需要权限校验。
    * API：
      * 通过上传与下载接口校验权限。
    * MCP：
      * 当前不提供上传工具。
  * 二次确认规则：
    * Web：
      * 需要二次确认的操作至少包括：断开 OAuth 账户、批量关注班级、账户删除、删除评论、删除作业、已关注班级列表中的退订。
      * 通常不需要二次确认的轻量操作包括：班级详情页中的单个关注 / 取关、作业完成状态切换、待办完成状态切换、评论反应、固定 / 取消固定链接。
    * API：
      * 仍需保持与 Web 一致的权限边界与错误反馈。
    * MCP：
      * 仍需保持与 Web / API 一致的权限边界。

## 边界场景

### 学期

* 结构化要求：

  * 当前学期不存在时：

    * 首页应展示可恢复空状态。
    * 应引导用户浏览或导入班级。
  * 用户只有非当前学期关注班级时：

    * 首页不应伪装成有当前学习任务。
    * 应明确提示当前学期未关注班级。
  * 用户跨学期浏览时：

    * 课程必须展示学期。
    * 班级必须展示学期。
    * 作业必须展示学期。
    * 考试必须展示学期。

#### 设计与交互决策

* 当前学期不存在时，首页应进入可恢复空状态，而不是渲染出误导性的空列表。
* 仅关注非当前学期班级时，应明确告诉用户“当前学期没有关注内容”，而不是假装一切正常。

### 消歧

* 结构化要求：

  * 多个课程同名时：

    * 应展示课程代码或其他消歧信息。
  * 用户关注同一课程的多个班级时：

    * 应展示班级号和学期。
  * 以下场景必须展示足够消歧字段：

    * 班级搜索。
    * 课程详情下属班级。
    * 批量导入结果。

#### 设计与交互决策

* 只要存在歧义风险，列表视图就必须优先展示能帮助选择的字段。
* 同名课程和同课多班级都不能只展示课程名。
* 跨学期或多班级场景下，学期和班级号是必须保留的信息。

### 缺失数据

* 结构化要求：

  * 班级缺教师、地点或考试时间时：

    * 应展示缺省状态。
    * 不应隐藏整个对象。
  * 作业没有截止时间时：

    * 不进入“临近截止”排序。
    * 仍可在作业列表中查看。
  * iCal 链接无可导出事件时：

    * 应返回有效但为空或提示性的日历内容。

#### 设计与交互决策

* 缺字段时优先展示缺省状态，而不是整块隐藏对象。
* 无截止时间作业保留可见性，但不混入临近截止排序。
* iCal 无事件时仍应返回有效结果，避免客户端因“空”而失败。

### 账户

* 结构化要求：

  * 用户修改用户名后：

    * 新主页应可访问。
    * 旧用户名不应继续代表该用户。
  * OAuth 连接异常时：

    * OAuth 连接重复应给出明确错误反馈。
    * 断开最后账户应给出明确错误反馈。
  * 账户删除时：

    * 必须要求用户输入确认词。
    * 删除成功后应退出当前会话并离开设置页。

#### 设计与交互决策

* 用户名变更后，新地址应立即成为规范入口。
* 旧用户名不应继续长期代表该用户，避免身份混淆。
* 断开最后一个可登录账户属于应被阻止的错误操作，不是普通失败重试场景。
* 账户删除比普通 destructive 操作更高风险，当前实现要求输入固定确认词 `DELETE`。

### 内容与安全

* 结构化要求：

  * 被封禁用户：

    * 不能发表新评论。
  * 上传附件下载：

    * 必须校验访问权限。
  * 高风险操作：

    * 删除必须有明确反馈。
    * 封禁必须有明确反馈。
    * 隐藏必须有明确反馈。

#### 设计与交互决策

* 被封禁用户不能发表新评论，这个限制需要在产品层和权限层同时成立。
* 上传附件下载必须再次校验访问权限，不能假设拿到链接就可以下载。
* 高风险操作采用明确反馈机制。
* 需要二次确认的操作至少包括：

  * 断开 OAuth 账户。
  * 批量关注班级。
  * 账户删除。
  * 删除评论。
  * 删除作业。
  * 已关注班级列表中的退订，需要一次 armed 点击后再次点击确认。
* 通常不需要二次确认的轻量操作包括：

  * 班级详情页中的单个关注 / 取关。
  * 作业完成状态切换。
  * 待办完成状态切换。
  * 评论反应。
  * 固定 / 取消固定链接。


---

## Audit Log

### Model

`AuditLog` records security-relevant mutations for forensic and compliance review.

| Field       | Type          | Notes                                      |
|-------------|---------------|--------------------------------------------|
| id          | String (cuid) | Primary key                                |
| action      | AuditAction   | Enum value (see below)                     |
| userId      | String        | Actor who performed the action             |
| targetId    | String?       | ID of the affected object                  |
| targetType  | String?       | "comment", "description", "upload", "user" |
| metadata    | Json?         | Extra context (body snippet, reason, etc.) |
| ipAddress   | String?       | From `x-forwarded-for` / `x-real-ip`       |
| userAgent   | String?       | From `user-agent` header                   |
| createdAt   | DateTime      | When the action occurred                   |

### Audited Actions (`AuditAction` enum)

| Value                     | Trigger                                          |
|---------------------------|--------------------------------------------------|
| `comment_create`          | POST `/api/comments`                             |
| `comment_edit`            | PATCH `/api/comments/[id]`                       |
| `comment_delete`          | DELETE `/api/comments/[id]`                      |
| `comment_react`           | POST `/api/comments/[id]/reactions`              |
| `description_edit`        | POST `/api/descriptions` (content changed)       |
| `upload_delete`           | DELETE `/api/uploads/[id]`                       |
| `admin_user_suspend`      | POST `/api/admin/suspensions`                    |
| `admin_user_unsuspend`    | PATCH `/api/admin/suspensions/[id]`              |
| `admin_comment_moderate`  | PATCH `/api/admin/comments/[id]`                 |
| `admin_description_moderate` | Reserved for future admin description actions |

### Helper

`writeAuditLog` in `src/lib/audit/write-audit-log.ts` writes a record. Calls are fire-and-forget (`.catch(() => {})`) so audit failures never block the main request.
