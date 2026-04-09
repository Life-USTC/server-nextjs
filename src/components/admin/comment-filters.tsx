import type { useTranslations } from "next-intl";
import { FiltersBar, FiltersBarSearch } from "@/components/filters/filters-bar";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommentStatusFilter } from "./moderation-types";

type CommentFiltersProps = {
  searchQuery: string;
  statusFilter: CommentStatusFilter;
  showStatusFilter?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CommentStatusFilter) => void;
  t: ReturnType<typeof useTranslations>;
};

export function CommentFilters({
  searchQuery,
  statusFilter,
  showStatusFilter = true,
  onSearchChange,
  onStatusChange,
  t,
}: CommentFiltersProps) {
  return (
    <FiltersBar>
      <FiltersBarSearch
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={t("searchPlaceholder")}
      />
      {showStatusFilter && (
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            const next: CommentStatusFilter =
              value === "all" ||
              value === "active" ||
              value === "softbanned" ||
              value === "deleted" ||
              value === "suspended"
                ? value
                : "active";
            onStatusChange(next);
          }}
          items={[
            { value: "all", label: t("filterAll") },
            { value: "active", label: t("filterActive") },
            { value: "softbanned", label: t("filterSoftbanned") },
            { value: "deleted", label: t("filterDeleted") },
            { value: "suspended", label: t("filterSuspended") },
          ]}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            <SelectItem value="active">{t("filterActive")}</SelectItem>
            <SelectItem value="softbanned">{t("filterSoftbanned")}</SelectItem>
            <SelectItem value="deleted">{t("filterDeleted")}</SelectItem>
            <SelectItem value="suspended">{t("filterSuspended")}</SelectItem>
          </SelectPopup>
        </Select>
      )}
    </FiltersBar>
  );
}
