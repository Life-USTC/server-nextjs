import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import type { FocusCardItem } from "../types";

type FocusStatusCardProps = {
  title: string;
  cards: FocusCardItem[];
};

export function FocusStatusCard({ title, cards }: FocusStatusCardProps) {
  if (cards.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardPanel className="space-y-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="rounded-md border px-3 py-2">
              <p className="mb-1 flex items-center gap-1 font-medium text-muted-foreground text-xs">
                <Icon className="h-3.5 w-3.5" />
                {card.title}
              </p>
              <p className="truncate font-semibold text-sm">{card.name}</p>
              <p className="truncate text-muted-foreground text-xs">
                {card.meta}
              </p>
              <p className="truncate text-muted-foreground text-xs">
                {card.sub}
              </p>
            </div>
          );
        })}
      </CardPanel>
    </Card>
  );
}
