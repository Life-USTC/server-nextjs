# tools/

开发脚本，不打包进生产镜像（`load-from-static.ts` 除外）。

| 脚本 | 用途 |
| --- | --- |
| `seed-dev-scenarios.ts` | 注入本地开发场景数据（用户、课程、作业等） |
| `reset-dev-scenarios.ts` | 清除场景数据 |
| `load-from-static.ts` | 从 JSON 导入教务课程数据（生产 cron 也用） |
| `load-sections.ts` / `load-schedules.ts` / `load-exams.ts` | 解析教务数据 |
| `load-semesters.ts` | 导入学期数据 |
| `openapi-postprocess.ts` | 修正生成的 OpenAPI JSON |
| `check-e2e-conventions.ts` | 检查 E2E 测试文件约定 |
| `check-i18n-keys.ts` | 审计缺失的翻译 key |

## 约定

- 新增模型或特殊逻辑时，必须更新 `seed-dev-scenarios.ts`
- seed 数据应覆盖 E2E 测试需要的场景
