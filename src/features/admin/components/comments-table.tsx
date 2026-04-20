import type { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminComment } from "./moderation-types";

type CommentsTableProps = {
  comments: AdminComment[];
  formatTimestamp: (value: string | Date) => string;
  onSelect: (comment: AdminComment) => void;
  getTargetLink: (comment: AdminComment) => { href: string; label: string };
  t: ReturnType<typeof useTranslations>;
};

export function CommentsTable({
  comments,
  formatTimestamp,
  onSelect,
  getTargetLink,
  t,
}: CommentsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("content")}</TableHead>
          <TableHead>{t("author")}</TableHead>
          <TableHead>{t("postedIn")}</TableHead>
          <TableHead>{t("createdAt")}</TableHead>
          <TableHead>{t("status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {comments.map((comment) => {
          const authorName =
            comment.user?.name ?? comment.authorName ?? t("guestLabel");
          const target = getTargetLink(comment);
          const statusLabel =
            comment.status === "softbanned"
              ? t("statusSoftbanned")
              : comment.status === "deleted"
                ? t("statusDeleted")
                : t("statusActive");

          return (
            <TableRow
              key={comment.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelect(comment)}
            >
              <TableCell className="max-w-md">
                <p className="line-clamp-2 text-sm">{comment.body}</p>
              </TableCell>
              <TableCell className="font-medium">{authorName}</TableCell>
              <TableCell className="max-w-sm text-sm">{target.label}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatTimestamp(comment.createdAt)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    comment.status === "active"
                      ? "default"
                      : comment.status === "softbanned"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {statusLabel}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
