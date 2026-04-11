# src/lib/

基础设施层，不直接面向用户。

| 子目录 | 职责 |
| --- | --- |
| `api/` | API 路由辅助：分页、错误处理、Zod schema、OpenAPI client |
| `auth/` | 鉴权辅助：session 获取、API 用户解析、Bearer token 验证 |
| `db/` | Prisma 单例 + locale 扩展（namePrimary/nameSecondary） |
| `mcp/` | MCP server 注册和工具定义 |
| `oauth/` | OAuth/OIDC 配置、client registration、scope 管理 |
| `storage/` | S3 抽象 + mock（`E2E_MOCK_S3=1` 启用本地文件存储） |
| `security/` | CSP 构建、HTTP 安全头 |
| `log/` | 结构化日志（`logAppEvent`、`logRouteFailure`） |
| `time/` | 时间格式化（上海时区） |
| `navigation/` | 导航辅助 |
| `ui/` | UI 工具（skeleton keys 等） |

## 约定

- 这里的代码不应包含业务逻辑，业务逻辑放 `src/features/`
- 数据库查询涉及名称时必须通过 `getPrisma(locale)`
- 新增 MCP 工具在 `mcp/tools/` 下添加文件，在 `mcp/server.ts` 中注册
