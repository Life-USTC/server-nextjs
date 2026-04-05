"use client";

import { ArrowLeft, Bus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type {
  BusMapCampusNode,
  BusMapData,
  BusMapRouteEdge,
} from "@/features/bus/lib/bus-types";
import { cn } from "@/shared/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROUTE_PALETTE = [
  "#dc2626", // red
  "#2563eb", // blue
  "#16a34a", // green
  "#ea580c", // orange
  "#9333ea", // purple
  "#0891b2", // cyan
  "#c026d3", // fuchsia
  "#4f46e5", // indigo
  "#65a30d", // lime
  "#d97706", // amber
];

const SVG_W = 900;
const SVG_H = 560;
const PAD = 100;
const NODE_R = 22;
const TRIP_DOT_R = 7;
const REFRESH_MS = 60_000;

type Pos = { x: number; y: number };

/* ------------------------------------------------------------------ */
/*  Layout helpers                                                     */
/* ------------------------------------------------------------------ */

/** Normalize campus lat/lng to SVG coordinates */
function layoutCampuses(campuses: BusMapCampusNode[]): Map<number, Pos> {
  if (campuses.length === 0) return new Map();

  const lats = campuses.map((c) => c.latitude);
  const lngs = campuses.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  const map = new Map<number, Pos>();
  for (const c of campuses) {
    const nx = (c.longitude - minLng) / lngRange;
    const ny = 1 - (c.latitude - minLat) / latRange;
    map.set(c.id, {
      x: PAD + nx * (SVG_W - 2 * PAD),
      y: PAD + ny * (SVG_H - 2 * PAD),
    });
  }
  return map;
}

/** Canonical segment key (undirected) */
function segKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Compute perpendicular offsets so parallel routes don't overlap */
function computeOffsets(routes: BusMapRouteEdge[]) {
  const seg = new Map<string, number[]>();
  for (const r of routes) {
    for (let i = 0; i < r.stops.length - 1; i++) {
      const k = segKey(r.stops[i].campusId, r.stops[i + 1].campusId);
      const list = seg.get(k) ?? [];
      if (!list.includes(r.routeId)) list.push(r.routeId);
      seg.set(k, list);
    }
  }
  const result = new Map<string, Map<number, number>>();
  for (const [k, ids] of seg) {
    const m = new Map<number, number>();
    for (let i = 0; i < ids.length; i++) {
      m.set(ids[i], (i - (ids.length - 1) / 2) * 5);
    }
    result.set(k, m);
  }
  return result;
}

function perpOffset(from: Pos, to: Pos, offset: number): Pos {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: (-dy / len) * offset, y: (dx / len) * offset };
}

function lerp(a: Pos, b: Pos, t: number): Pos {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function routeColor(routeId: number, allIds: number[]): string {
  const idx = allIds.indexOf(routeId);
  return ROUTE_PALETTE[idx >= 0 ? idx % ROUTE_PALETTE.length : 0];
}

/** Place label above or below campus node depending on position */
function labelOffset(pos: Pos): { dy: number } {
  return pos.y < SVG_H / 2 ? { dy: NODE_R + 18 } : { dy: -(NODE_R + 8) };
}

/** Parse "HH:MM" to minutes since midnight */
function hhmmToMin(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusTransitMap({ data }: { data: BusMapData | null }) {
  const t = useTranslations("busMap");
  const tBus = useTranslations("bus");
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }, [router]);

  const positions = useMemo(
    () => (data ? layoutCampuses(data.campuses) : new Map<number, Pos>()),
    [data],
  );
  const allRouteIds = useMemo(
    () => (data ? data.routes.map((r) => r.routeId) : []),
    [data],
  );
  const offsets = useMemo(
    () => (data ? computeOffsets(data.routes) : new Map()),
    [data],
  );

  /* ---- Empty state ---- */
  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <Bus className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-lg text-muted-foreground">{t("noData")}</p>
        <Link href="/?tab=bus" className="text-primary text-sm hover:underline">
          {t("backToBus")}
        </Link>
      </div>
    );
  }

  const enRoute = data.activeTrips.filter((tr) => tr.status === "en-route");
  const departingSoon = data.activeTrips.filter(
    (tr) => tr.status === "departing-soon",
  );
  const nowMin = (() => {
    const d = new Date(data.now);
    return d.getHours() * 60 + d.getMinutes();
  })();

  const totalTripsToday = data.routes.reduce(
    (s, r) =>
      s + (data.todayType === "weekday" ? r.weekdayTrips : r.weekendTrips),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/?tab=bus"
          className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToBus")}
        </Link>
        <div className="flex-1" />
        <Badge
          variant="outline"
          className="font-semibold text-[10px] uppercase tracking-widest"
        >
          {t("experimental")}
        </Badge>
      </div>

      <div className="mb-2 flex items-end gap-3">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-muted-foreground text-xs transition-all hover:bg-card hover:text-foreground"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
          />
        </button>
      </div>

      {/* Map + Sidebar */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* SVG transit map */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="h-auto w-full"
            style={{ minHeight: 280 }}
          >
            <title>{t("title")}</title>
            <defs>
              <filter id="trip-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Route lines */}
            {data.routes.map((route) => {
              const color = routeColor(route.routeId, allRouteIds);
              return (
                <g key={route.routeId}>
                  {route.stops.slice(0, -1).map((stop, i) => {
                    const nextStop = route.stops[i + 1];
                    const from = positions.get(stop.campusId);
                    const to = positions.get(nextStop.campusId);
                    if (!from || !to) return null;
                    const k = segKey(stop.campusId, nextStop.campusId);
                    const off = offsets.get(k)?.get(route.routeId) ?? 0;
                    const p = perpOffset(from, to, off);
                    return (
                      <line
                        key={`${route.routeId}-${i}`}
                        x1={from.x + p.x}
                        y1={from.y + p.y}
                        x2={to.x + p.x}
                        y2={to.y + p.y}
                        stroke={color}
                        strokeWidth={3}
                        strokeLinecap="round"
                        opacity={0.65}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* En-route trip dots */}
            {enRoute.map((trip) => {
              const route = data.routes.find((r) => r.routeId === trip.routeId);
              if (
                !route ||
                trip.fromStopOrder == null ||
                trip.toStopOrder == null
              )
                return null;
              const fromCampus = route.stops[trip.fromStopOrder];
              const toCampus = route.stops[trip.toStopOrder];
              if (!fromCampus || !toCampus) return null;
              const from = positions.get(fromCampus.campusId);
              const to = positions.get(toCampus.campusId);
              if (!from || !to) return null;

              const k = segKey(fromCampus.campusId, toCampus.campusId);
              const off = offsets.get(k)?.get(trip.routeId) ?? 0;
              const p = perpOffset(from, to, off);
              const pos = lerp(
                { x: from.x + p.x, y: from.y + p.y },
                { x: to.x + p.x, y: to.y + p.y },
                trip.segmentProgress ?? 0.5,
              );
              const color = routeColor(trip.routeId, allRouteIds);

              return (
                <g key={`en-${trip.tripId}`} filter="url(#trip-glow)">
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={TRIP_DOT_R}
                    fill={color}
                    opacity={0.9}
                  >
                    <animate
                      attributeName="r"
                      values={`${TRIP_DOT_R};${TRIP_DOT_R + 2};${TRIP_DOT_R}`}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle cx={pos.x} cy={pos.y} r={3} fill="white" />
                </g>
              );
            })}

            {/* Departing-soon: pulsing ring at departure campus */}
            {departingSoon.map((trip) => {
              const route = data.routes.find((r) => r.routeId === trip.routeId);
              if (!route || route.stops.length === 0) return null;
              const pos = positions.get(route.stops[0].campusId);
              if (!pos) return null;
              const color = routeColor(trip.routeId, allRouteIds);

              return (
                <circle
                  key={`dep-${trip.tripId}`}
                  cx={pos.x}
                  cy={pos.y}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                >
                  <animate
                    attributeName="r"
                    values={`${NODE_R + 4};${NODE_R + 14};${NODE_R + 4}`}
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;0.08;0.5"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              );
            })}

            {/* Campus nodes */}
            {data.campuses.map((campus) => {
              const pos = positions.get(campus.id);
              if (!pos) return null;
              const lbl = labelOffset(pos);
              const routeCount = data.routes.filter((r) =>
                r.stops.some((s) => s.campusId === campus.id),
              ).length;

              return (
                <g key={campus.id}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_R}
                    className="fill-card stroke-border"
                    strokeWidth={2.5}
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_R - 4}
                    fill="none"
                    className="stroke-foreground"
                    strokeWidth={1.5}
                    opacity={routeCount > 3 ? 0.55 : 0.25}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + lbl.dy}
                    textAnchor="middle"
                    className="fill-foreground font-semibold text-[13px]"
                    style={{ fontFamily: "system-ui, sans-serif" }}
                  >
                    {campus.namePrimary}
                  </text>
                  {campus.nameSecondary && (
                    <text
                      x={pos.x}
                      y={pos.y + lbl.dy + 15}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                      style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                      {campus.nameSecondary}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="rounded-xl border border-border/60 bg-card/80 p-4">
            <h3 className="mb-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-widest">
              {t("legend.title")}
            </h3>
            <div className="space-y-1.5">
              {data.routes.map((route) => (
                <div key={route.routeId} className="flex items-center gap-2">
                  <span
                    className="h-2 w-6 shrink-0 rounded-full"
                    style={{
                      backgroundColor: routeColor(route.routeId, allRouteIds),
                    }}
                  />
                  <span className="truncate text-xs">
                    {route.descriptionPrimary}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 border-border/40 border-t pt-3 text-muted-foreground text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                </span>
                {t("legend.enRoute")}
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-pulse rounded-full border border-amber-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 translate-x-0.5 translate-y-0.5 rounded-full bg-amber-400" />
                </span>
                {t("legend.departingSoon")}
              </div>
            </div>
          </div>

          {/* Active trips */}
          <div className="rounded-xl border border-border/60 bg-card/80 p-4">
            <h3 className="mb-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-widest">
              {data.activeTrips.length > 0
                ? `${enRoute.length} ${t("legend.enRoute")} · ${departingSoon.length} ${t("legend.departingSoon")}`
                : t("status.noActive")}
            </h3>
            {data.activeTrips.length === 0 ? (
              <p className="text-muted-foreground/50 text-xs">
                {t("status.noActive")}
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {data.activeTrips.map((trip) => {
                  const route = data.routes.find(
                    (r) => r.routeId === trip.routeId,
                  );
                  const color = routeColor(trip.routeId, allRouteIds);
                  const depMin = hhmmToMin(trip.departureTime);
                  const etaLabel =
                    trip.status === "departing-soon" && depMin != null
                      ? t("status.departingSoon", {
                          minutes: Math.max(0, depMin - nowMin),
                        })
                      : t("status.enRoute");

                  return (
                    <div
                      key={trip.tripId}
                      className="flex items-center gap-2 rounded-lg border border-border/30 bg-background/50 px-3 py-2"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-xs">
                          {route?.descriptionPrimary ?? `Route ${trip.routeId}`}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
                          {trip.departureTime} → {trip.arrivalTime}
                        </p>
                      </div>
                      <Badge
                        variant={
                          trip.status === "en-route" ? "default" : "outline"
                        }
                        className="shrink-0 text-[10px]"
                      >
                        {etaLabel}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Day type + stats */}
          <div className="rounded-xl border border-border/60 bg-card/80 p-4 text-muted-foreground text-xs">
            <p className="font-medium">
              {tBus(`dayType.${data.todayType}`)} ·{" "}
              <span className="font-mono tabular-nums">
                {new Date(data.now).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
            <p className="mt-1">
              {t(`tripCount.${data.todayType}`, { count: totalTripsToday })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
