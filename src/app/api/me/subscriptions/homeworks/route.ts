import { getViewerContext } from "@/features/comments/server/comment-utils";
import {
  getHomeworkCommentCounts,
  getSubscribedSectionIds,
  listSubscribedHomeworkAuditLogs,
  listSubscribedHomeworks,
} from "@/features/home/server/subscribed-data";
import {
  handleRouteError,
  jsonResponse,
  unauthorized,
} from "@/lib/api/helpers";
import { resolveApiUserId } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

/**
 * List homeworks for all subscribed sections in a single call.
 * @response subscribedHomeworksResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  try {
    const viewer = await getViewerContext({
      includeAdmin: true,
      userId,
    });

    const sectionIds = await getSubscribedSectionIds(userId);

    if (sectionIds.length === 0) {
      return jsonResponse({
        viewer,
        homeworks: [],
        auditLogs: [],
        sectionIds: [],
      });
    }

    const [homeworks, auditLogs] = await Promise.all([
      listSubscribedHomeworks(userId, {
        locale: "zh-cn",
        includeEditors: true,
        sectionIds,
      }),
      listSubscribedHomeworkAuditLogs(userId, 50, sectionIds),
    ]);

    const commentCounts = await getHomeworkCommentCounts(
      homeworks.map((homework) => homework.id),
    );

    const responseHomeworks = homeworks.map((homework) => {
      const { homeworkCompletions, ...rest } = homework;
      return {
        ...rest,
        completion: homeworkCompletions?.[0] ?? null,
        commentCount: commentCounts.get(homework.id) ?? 0,
      };
    });

    return jsonResponse({
      viewer,
      homeworks: responseHomeworks,
      auditLogs,
      sectionIds,
    });
  } catch (error) {
    return handleRouteError("Failed to fetch subscribed homeworks", error);
  }
}
