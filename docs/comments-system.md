# 评论系统业务逻辑整理

本文档整理当前评论系统的主要业务流程、数据结构、API 以及前端交互。内容以当前代码为准。

## 数据模型（Prisma）
- Comment
  - body / visibility / status / isAnonymous / authorName
  - createdAt / updatedAt / deletedAt / moderatedAt / moderationNote
  - userId（可为空，匿名或被删除用户）
  - parentId / rootId（支持楼中楼）
  - 目标字段：sectionId / courseId / teacherId / sectionTeacherId
- CommentAttachment
  - commentId / uploadId（关联 Upload）
- CommentReaction
  - commentId / userId / type
- UserSuspension
  - userId / createdById / reason / expiresAt / liftedAt

状态枚举：
- CommentStatus：active / softbanned / deleted
- CommentVisibility：public / logged_in_only / anonymous

## 目标类型与定位
评论支持四类目标：
- section：班级
- course：课程
- teacher：教师
- section-teacher：班级+教师组合

评论定位统一使用锚点：
- #comment-{comment.id}

`/comments/{id}` 目前只用于跳转到对应目标页面并带上锚点。

## 权限与可见性规则
可见性/状态的核心逻辑在序列化阶段统一处理：

- deleted：默认隐藏；如果有可见的子评论则保留线程结构
- softbanned：对管理员与作者可见；对其他用户隐藏
- logged_in_only：未登录用户不可见，并计入 hiddenCount
- anonymous：对非管理员隐藏作者信息

对非管理员视角：
- softbanned 评论会被“伪装为 active”返回，避免在 API/UI 中泄露状态
- deleted 评论不会被返回（除非为可见子评论提供结构）

## API 概览

### 公共评论 API
- GET /api/comments
  - 根据 targetType 与目标 id 拉取评论树
  - 返回 comments / hiddenCount / viewer / target
- POST /api/comments
  - 创建评论或回复
  - 校验：登录、内容长度、目标一致性、封禁状态
  - 支持 attachmentIds

- GET /api/comments/{id}
  - 返回评论所在 thread，并定位 focusId
  - 若无权限（例如不可见）返回 403
- PATCH /api/comments/{id}
  - 作者可编辑（含附件、可见性、匿名）
- DELETE /api/comments/{id}
  - 作者软删除（status=deleted）

### 评论反应
- POST /api/comments/{id}/reactions
- DELETE /api/comments/{id}/reactions
  - 需要登录；被封禁用户不可操作

### 管理端
- GET /api/admin/comments
  - 管理员获取评论列表（支持 status 过滤）
- PATCH /api/admin/comments/{id}
  - 管理员更新 status / moderationNote
- GET /api/admin/suspensions
- POST /api/admin/suspensions
- PATCH /api/admin/suspensions/{id}

### 附件上传（评论复用上传体系）
- POST /api/uploads（预签名）
- POST /api/uploads/complete（完成入库）
- GET /api/uploads（获取用户上传列表/配额）
- GET /api/uploads/{id}/download（下载/预览）

## 序列化与返回结构
`buildCommentNodes` 将 Comment + 关联数据构建为树结构，并执行：
- 子评论聚合
- 状态/可见性过滤
- 作者身份与 USTC 认证徽章判断
- 反应统计与 viewerHasReacted
- 附件信息组装为可下载 URL

对非管理员：
- softbanned 状态被转换为 active 返回
- UI 侧不会出现 “仅自己可见” 标识

## 前端交互与组件

前端文案需通过 i18n（`messages/en-us.json` 与 `messages/zh-cn.json`），避免硬编码字符串。

### 评论入口
评论区由页面引入 CommentsSection：
- /sections/{jwId}
- /courses/{jwId}
- /teachers/{id}

### CommentsSection
负责：
- 加载评论与 viewer
- 组装 target 选项与 teacher 过滤（section-teacher）
- 提交评论/回复/编辑/删除
- 反应操作

### CommentThread
负责：
- 树形渲染
- hash 定位与高亮
- 评论项操作（回复/编辑/删除/举报）

### CommentEditor
负责：
- Markdown 编辑与预览
- 匿名/可见性选择
- 附件上传与插入

### CommentMarkdown
负责：
- Markdown/MDX 渲染（受限组件）
- 图片/链接/数学公式展示

### CommentReactions
负责：
- 表情反应增删

## 我的评论页
/dashboard/comments 页面只展示本人评论列表：
- 当前显示 active + softbanned
- 删除评论不展示
- 点击行跳转到目标锚点

## 管理后台
管理员页面包括：
- /admin/moderation
  - 评论列表与封禁管理
  - 评论目标跳转至对应锚点
  - 状态更新与封禁操作

## 关键文件索引
- 数据模型：prisma/schema.prisma
- 过滤与序列化：src/lib/comment-serialization.ts
- viewer 与封禁判定：src/lib/comment-utils.ts
- 评论 API：src/app/api/comments/**
- 反应 API：src/app/api/comments/[id]/reactions
- 管理 API：src/app/api/admin/comments/**、/admin/suspensions/**
- 评论 UI：src/components/comments/**
- 管理端 UI：src/components/admin/moderation-dashboard.tsx
- 评论跳转：src/app/comments/[id]/page.tsx
