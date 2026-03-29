import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllScheduleConfigs } from "@/features/bus-schedule/server/bus-schedule-server";
import { requireSignedInUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return {
    title: t("busScheduleTitle"),
  };
}

export default async function AdminBusSchedulePage() {
  const userId = await requireSignedInUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  const isAdmin = user?.isAdmin ?? false;
  if (!isAdmin) {
    notFound();
  }

  const [configs, t, tCommon, tBus] = await Promise.all([
    getAllScheduleConfigs(),
    getTranslations("admin"),
    getTranslations("common"),
    getTranslations("busSchedule"),
  ]);

  const now = new Date();

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">{t("title")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t("busScheduleTitle")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-8 mb-8">
        <h1 className="mb-2 text-display">{t("busScheduleTitle")}</h1>
        <p className="text-muted-foreground text-subtitle">
          {t("busScheduleDescription")}
        </p>
      </div>

      {configs.length === 0 ? (
        <p className="text-muted-foreground">{tBus("noSchedule")}</p>
      ) : (
        <div className="space-y-6">
          {configs.map((config) => {
            const isActive =
              config.effectiveFrom <= now &&
              (config.effectiveUntil === null || config.effectiveUntil >= now);
            const isFuture = config.effectiveFrom > now;

            return (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>{config.name}</CardTitle>
                    {isActive ? (
                      <Badge variant="default">{tBus("active")}</Badge>
                    ) : isFuture ? (
                      <Badge variant="outline">{tBus("upcoming")}</Badge>
                    ) : (
                      <Badge variant="secondary">{tBus("expired")}</Badge>
                    )}
                  </div>
                  <CardDescription>
                    {tBus("effectiveRange", {
                      from: config.effectiveFrom.toLocaleDateString(),
                      to: config.effectiveUntil
                        ? config.effectiveUntil.toLocaleDateString()
                        : tBus("indefinite"),
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {tBus("routeNumber", { number: "" })}
                        </TableHead>
                        <TableHead>{tBus("stops")}</TableHead>
                        <TableHead>{tBus("weekdayTrips")}</TableHead>
                        <TableHead>{tBus("weekendTrips")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config.routes.map((route) => (
                        <TableRow key={route.id}>
                          <TableCell className="font-mono">
                            {route.routeNumber}
                          </TableCell>
                          <TableCell>
                            {route.stops.map((rs) => rs.stop.name).join(" → ")}
                          </TableCell>
                          <TableCell>
                            {
                              route.trips.filter(
                                (trip) => trip.dayType === "weekday",
                              ).length
                            }
                          </TableCell>
                          <TableCell>
                            {
                              route.trips.filter(
                                (trip) => trip.dayType === "weekend",
                              ).length
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {config.sourceMessage ? (
                    <p className="mt-4 text-muted-foreground text-sm">
                      {config.sourceUrl ? (
                        <a
                          href={config.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {config.sourceMessage}
                        </a>
                      ) : (
                        config.sourceMessage
                      )}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
