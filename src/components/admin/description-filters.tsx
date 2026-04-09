import type { useTranslations } from "next-intl";
import { FiltersBar, FiltersBarSearch } from "@/components/filters/filters-bar";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DescriptionContentFilter } from "./moderation-types";

type DescriptionFiltersProps = {
  searchQuery: string;
  contentFilter: DescriptionContentFilter;
  onSearchChange: (value: string) => void;
  onContentChange: (value: DescriptionContentFilter) => void;
  t: ReturnType<typeof useTranslations>;
};

export function DescriptionFilters({
  searchQuery,
  contentFilter,
  onSearchChange,
  onContentChange,
  t,
}: DescriptionFiltersProps) {
  return (
    <FiltersBar>
      <FiltersBarSearch
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={t("searchPlaceholder")}
      />

      <Select
        value={contentFilter}
        onValueChange={(value) => {
          const next: DescriptionContentFilter =
            value === "all" || value === "withContent" || value === "empty"
              ? value
              : "withContent";
          onContentChange(next);
        }}
        items={[
          { value: "withContent", label: t("descriptionContentWith") },
          { value: "empty", label: t("descriptionContentEmpty") },
          { value: "all", label: t("filterAll") },
        ]}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          <SelectItem value="withContent">
            {t("descriptionContentWith")}
          </SelectItem>
          <SelectItem value="empty">{t("descriptionContentEmpty")}</SelectItem>
          <SelectItem value="all">{t("filterAll")}</SelectItem>
        </SelectPopup>
      </Select>
    </FiltersBar>
  );
}
