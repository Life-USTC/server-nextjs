import { DescriptionPanel } from "@/components/descriptions/description-panel";
import { getViewerContext } from "@/features/comments/server/comment-utils";
import { getDescriptionPayload } from "@/features/descriptions/server/descriptions-server";

export async function DescriptionLoader({
  targetType,
  targetId,
}: {
  targetType: "section" | "course" | "teacher" | "homework";
  targetId: number | string;
}) {
  const viewer = await getViewerContext({ includeAdmin: false });
  const descriptionData = await getDescriptionPayload(
    targetType,
    targetId,
    viewer,
  );

  return (
    <DescriptionPanel
      targetType={targetType}
      targetId={targetId}
      initialData={descriptionData}
    />
  );
}
