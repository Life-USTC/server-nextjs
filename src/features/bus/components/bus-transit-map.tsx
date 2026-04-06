"use client";

import { ArrowLeft, Bus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type {
  BusMapActiveTrip,
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
const TRACK_SPACING = 7;
const BUS_W = 16;
const BUS_H = 10;
const REFRESH_MS = 60_000;

type Pos = { x: number; y: number };

type TooltipData = {
  svgX: number;
  svgY: number;
  lines: string[];
  color: string;
};

/* ------------------------------------------------------------------ */
/*  Layout helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Lay out campus nodes in SVG space.
 *
 * NOTE: In the DB, latitude/longitude fields are swapped for USTC campuses:
 *   c.latitude  ≈ 117.x  (real longitude — east/west)
 *   c.longitude ≈ 31.x   (real latitude  — north/south)
 * So: realLon → x (east = right), realLat → y-flipped (north = up → lower y)
 */
function layoutCampuses(campuses: BusMapCampusNode[]): Map<number, Pos> {
  if (campuses.length === 0) return new Map();

  const realLons = campuses.map((c) => c.latitude);
  const realLats = campuses.map((c) => c.longitude);
  const minLon = Math.min(...realLons);
  const maxLon = Math.max(...realLons);
  const minLat = Math.min(...realLats);
  const maxLat = Math.max(...realLats);
  const rangeLon = maxLon - minLon || 1;
  const rangeLat = maxLat - minLat || 1;

  const usableW = SVG_W - 2 * PAD;
  const usableH = SVG_H - 2 * PAD;
  const scaleX = usableW / rangeLon;
  const scaleY = usableH / rangeLat;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = PAD + (usableW - rangeLon * scale) / 2;
  const offsetY = PAD + (usableH - rangeLat * scale) / 2;

  const positions: { id: number; x: number; y: number }[] = campuses.map(
    (c) => ({
      id: c.id,
      x: offsetX + (c.latitude - minLon) * scale,
      y: offsetY + (maxLat - c.longitude) * scale,
    }),
  );

  const MIN_GAP = NODE_R * 4.5;
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MIN_GAP && dist > 0) {
          const push = ((MIN_GAP - dist) / 2 + 1) / dist;
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
          moved = true;
        }
      }
    }
    for (const p of positions) {
      p.x = Math.max(PAD, Math.min(SVG_W - PAD, p.x));
      p.y = Math.max(PAD, Math.min(SVG_H - PAD, p.y));
    }
    if (!moved) break;
  }

  const map = new Map<number, Pos>();
  for (const p of positions) map.set(p.id, { x: p.x, y: p.y });
  return map;
}

/** Canonical segment key (undirected) */
function segKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Compute perpendicular offsets for routes sharing segments.
 * Uses fixed TRACK_SPACING for clean metro-style parallel lines.
 */
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
      m.set(ids[i], (i - (ids.length - 1) / 2) * TRACK_SPACING);
    }
    result.set(k, m);
  }
  return result;
}

/**
 * Compute perpendicular offset using canonical (lower→higher ID) direction.
 * This ensures all routes on the same segment offset consistently.
 */
function canonicalPerp(
  campusA: number,
  campusB: number,
  routeId: number,
  positions: Map<number, Pos>,
  offsets: Map<string, Map<number, number>>,
): Pos {
  const k = segKey(campusA, campusB);
  const off = offsets.get(k)?.get(routeId) ?? 0;
  if (off === 0) return { x: 0, y: 0 };

  const [lo, hi] = campusA < campusB ? [campusA, campusB] : [campusB, campusA];
  const pLo = positions.get(lo);
  const pHi = positions.get(hi);
  if (!pLo || !pHi) return { x: 0, y: 0 };

  const dx = pHi.x - pLo.x;
  const dy = pHi.y - pLo.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: (-dy / len) * off, y: (dx / len) * off };
}

/** Build offset polyline points for a route (metro-style parallel tracks) */
function buildRoutePoints(
  route: BusMapRouteEdge,
  positions: Map<number, Pos>,
  offsets: Map<string, Map<number, number>>,
): Pos[] {
  const pts: Pos[] = [];
  const stops = route.stops;

  for (let i = 0; i < stops.length; i++) {
    const base = positions.get(stops[i].campusId);
    if (!base) continue;

    let off: Pos;
    if (stops.length < 2) {
      off = { x: 0, y: 0 };
    } else if (i === 0) {
      off = canonicalPerp(
        stops[0].campusId,
        stops[1].campusId,
        route.routeId,
        positions,
        offsets,
      );
    } else if (i === stops.length - 1) {
      off = canonicalPerp(
        stops[i - 1].campusId,
        stops[i].campusId,
        route.routeId,
        positions,
        offsets,
      );
    } else {
      // Intermediate: average incoming and outgoing offsets for smooth join
      const a = canonicalPerp(
        stops[i - 1].campusId,
        stops[i].campusId,
        route.routeId,
        positions,
        offsets,
      );
      const b = canonicalPerp(
        stops[i].campusId,
        stops[i + 1].campusId,
        route.routeId,
        positions,
        offsets,
      );
      off = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    pts.push({ x: base.x + off.x, y: base.y + off.y });
  }
  return pts;
}

function pointsToPath(pts: Pos[]): string {
  if (pts.length < 2) return "";
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

function lerp(a: Pos, b: Pos, t: number): Pos {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function routeColor(routeId: number, allIds: number[]): string {
  const idx = allIds.indexOf(routeId);
  return ROUTE_PALETTE[idx >= 0 ? idx % ROUTE_PALETTE.length : 0];
}

function labelOffset(pos: Pos): { dy: number } {
  return pos.y < SVG_H / 2 ? { dy: NODE_R + 18 } : { dy: -(NODE_R + 8) };
}

function hhmmToMin(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Compute bus icon position + rotation for an en-route trip */
function computeBusTransform(
  trip: BusMapActiveTrip,
  route: BusMapRouteEdge,
  positions: Map<number, Pos>,
  offsets: Map<string, Map<number, number>>,
): { x: number; y: number; angle: number } | null {
  if (trip.fromStopOrder == null || trip.toStopOrder == null) return null;
  const fromStop = route.stops[trip.fromStopOrder];
  const toStop = route.stops[trip.toStopOrder];
  if (!fromStop || !toStop) return null;

  const from = positions.get(fromStop.campusId);
  const to = positions.get(toStop.campusId);
  if (!from || !to) return null;

  const off = canonicalPerp(
    fromStop.campusId,
    toStop.campusId,
    trip.routeId,
    positions,
    offsets,
  );
  const p1 = { x: from.x + off.x, y: from.y + off.y };
  const p2 = { x: to.x + off.x, y: to.y + off.y };
  // Clamp bus away from station boundaries
  const t = Math.max(0.15, Math.min(0.85, trip.segmentProgress ?? 0.5));
  const pos = lerp(p1, p2, t);
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);

  return { x: pos.x, y: pos.y, angle };
}

/* ------------------------------------------------------------------ */
/*  Bus SVG icon (inline)                                              */
/* ------------------------------------------------------------------ */

function BusIcon({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <>
      <rect
        x={-BUS_W / 2}
        y={-BUS_H / 2}
        width={BUS_W}
        height={BUS_H}
        rx={2.5}
        fill={color}
        opacity={opacity}
      />
      {/* Windshield */}
      <rect
        x={BUS_W / 2 - 5.5}
        y={-BUS_H / 2 + 2}
        width={4}
        height={BUS_H - 4}
        rx={1}
        fill="white"
        opacity={0.85}
      />
      {/* Headlights */}
      <circle
        cx={BUS_W / 2 - 1}
        cy={-BUS_H / 2 + 2}
        r={1}
        fill="white"
        opacity={0.6}
      />
      <circle
        cx={BUS_W / 2 - 1}
        cy={BUS_H / 2 - 2}
        r={1}
        fill="white"
        opacity={0.6}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusTransitMap({ data }: { data: BusMapData | null }) {
  const t = useTranslations("busMap");
  const tBus = useTranslations("bus");
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<number | null>(null);

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
  const routePaths = useMemo(() => {
    if (!data) return new Map<number, { points: Pos[]; d: string }>();
    const map = new Map<number, { points: Pos[]; d: string }>();
    for (const route of data.routes) {
      const points = buildRoutePoints(route, positions, offsets);
      map.set(route.routeId, { points, d: pointsToPath(points) });
    }
    return map;
  }, [data, positions, offsets]);

  const activeRouteIds = useMemo(() => {
    if (!data) return new Set<number>();
    return new Set(data.activeTrips.map((tr) => tr.routeId));
  }, [data]);

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

  // Group departing-soon trips by campus for staggering
  const depByCampus = new Map<number, typeof departingSoon>();
  for (const trip of departingSoon) {
    const route = data.routes.find((r) => r.routeId === trip.routeId);
    if (!route || route.stops.length === 0) continue;
    const cId = route.stops[0].campusId;
    const list = depByCampus.get(cId) ?? [];
    list.push(trip);
    depByCampus.set(cId, list);
  }

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
        {/* SVG transit map with tooltip overlay */}
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="h-auto w-full"
            style={{ minHeight: 280 }}
            onMouseLeave={() => {
              setTooltip(null);
              setHoveredRoute(null);
            }}
          >
            <title>{t("title")}</title>
            <defs>
              <filter id="bus-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <style>{`
                @keyframes dash-march {
                  to { stroke-dashoffset: -12; }
                }
              `}</style>
            </defs>

            {/* Background track-bed lines (wide, muted) */}
            {data.routes.map((route) => {
              const pathData = routePaths.get(route.routeId);
              if (!pathData?.d) return null;
              return (
                <path
                  key={`bg-${route.routeId}`}
                  d={pathData.d}
                  stroke={routeColor(route.routeId, allRouteIds)}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={hoveredRoute === route.routeId ? 0.2 : 0.06}
                  style={{ transition: "opacity 0.2s" }}
                />
              );
            })}

            {/* Main route polylines */}
            {data.routes.map((route) => {
              const pathData = routePaths.get(route.routeId);
              if (!pathData?.d) return null;
              const color = routeColor(route.routeId, allRouteIds);
              const isActive = activeRouteIds.has(route.routeId);
              const isHovered = hoveredRoute === route.routeId;
              const trips =
                data.todayType === "weekday"
                  ? route.weekdayTrips
                  : route.weekendTrips;

              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: SVG path with hover interaction
                <path
                  key={`route-${route.routeId}`}
                  d={pathData.d}
                  stroke={color}
                  strokeWidth={isHovered ? 4.5 : 3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={hoveredRoute != null && !isHovered ? 0.25 : 0.85}
                  className="cursor-pointer"
                  style={{
                    transition: "opacity 0.2s, stroke-width 0.15s",
                    ...(isActive
                      ? {
                          strokeDasharray: "8 4",
                          animation: "dash-march 0.8s linear infinite",
                        }
                      : {}),
                  }}
                  onMouseEnter={(e) => {
                    setHoveredRoute(route.routeId);
                    const svg = (e.target as SVGElement).closest("svg");
                    if (!svg) return;
                    const pt = svg.createSVGPoint();
                    pt.x = e.clientX;
                    pt.y = e.clientY;
                    const ctm = svg.getScreenCTM();
                    if (!ctm) return;
                    const svgPt = pt.matrixTransform(ctm.inverse());
                    setTooltip({
                      svgX: svgPt.x,
                      svgY: svgPt.y - 14,
                      lines: [
                        route.descriptionPrimary,
                        `${trips} trips (${data.todayType})`,
                      ],
                      color,
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredRoute(null);
                    setTooltip(null);
                  }}
                />
              );
            })}

            {/* En-route bus icons */}
            {enRoute.map((trip) => {
              const route = data.routes.find((r) => r.routeId === trip.routeId);
              if (!route) return null;
              const transform = computeBusTransform(
                trip,
                route,
                positions,
                offsets,
              );
              if (!transform) return null;
              const color = routeColor(trip.routeId, allRouteIds);

              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: SVG group with hover interaction
                <g
                  key={`bus-${trip.tripId}`}
                  transform={`translate(${transform.x.toFixed(1)},${transform.y.toFixed(1)}) rotate(${transform.angle.toFixed(1)})`}
                  filter="url(#bus-glow)"
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredRoute(trip.routeId);
                    setTooltip({
                      svgX: transform.x,
                      svgY: transform.y - 20,
                      lines: [
                        route.descriptionPrimary,
                        `${trip.departureTime} → ${trip.arrivalTime}`,
                        t("status.enRoute"),
                      ],
                      color,
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredRoute(null);
                    setTooltip(null);
                  }}
                >
                  <BusIcon color={color} />
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0,0; 0,-1.5; 0,0"
                    dur="2s"
                    repeatCount="indefinite"
                    additive="sum"
                  />
                </g>
              );
            })}

            {/* Departing-soon: bus at departure station with pulsing ring */}
            {departingSoon.map((trip) => {
              const route = data.routes.find((r) => r.routeId === trip.routeId);
              if (!route || route.stops.length === 0) return null;
              const campusId = route.stops[0].campusId;
              const pos = positions.get(campusId);
              if (!pos) return null;
              const color = routeColor(trip.routeId, allRouteIds);

              // Stagger multiple departing buses at same station
              const siblings = depByCampus.get(campusId) ?? [];
              const idx = siblings.indexOf(trip);
              const total = siblings.length;
              const spreadAngle = total > 1 ? (Math.PI * 0.6) / (total - 1) : 0;
              const baseAngle = -Math.PI / 2 - (spreadAngle * (total - 1)) / 2;
              const sAngle = baseAngle + idx * spreadAngle;
              const staggerR = NODE_R + 14;
              const bx = pos.x + Math.cos(sAngle) * staggerR;
              const by = pos.y + Math.sin(sAngle) * staggerR;

              // Point bus toward first destination
              const nextStop = route.stops[1];
              const nextPos = nextStop
                ? positions.get(nextStop.campusId)
                : null;
              const busAngle = nextPos
                ? Math.atan2(nextPos.y - pos.y, nextPos.x - pos.x) *
                  (180 / Math.PI)
                : 0;

              const depMin = hhmmToMin(trip.departureTime);
              const etaMin =
                depMin != null ? Math.max(0, depMin - nowMin) : null;

              return (
                <g key={`dep-${trip.tripId}`}>
                  <circle
                    cx={bx}
                    cy={by}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                  >
                    <animate
                      attributeName="r"
                      values={`${BUS_W / 2 + 2};${BUS_W / 2 + 12};${BUS_W / 2 + 2}`}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.05;0.6"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG group with hover interaction */}
                  <g
                    transform={`translate(${bx.toFixed(1)},${by.toFixed(1)}) rotate(${busAngle.toFixed(1)})`}
                    className="cursor-pointer"
                    onMouseEnter={() => {
                      setHoveredRoute(trip.routeId);
                      setTooltip({
                        svgX: bx,
                        svgY: by - 20,
                        lines: [
                          route.descriptionPrimary,
                          `${trip.departureTime} → ${trip.arrivalTime}`,
                          etaMin != null
                            ? t("status.departingSoon", { minutes: etaMin })
                            : t("legend.departingSoon"),
                        ],
                        color,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredRoute(null);
                      setTooltip(null);
                    }}
                  >
                    <BusIcon color={color} opacity={0.85} />
                  </g>
                </g>
              );
            })}

            {/* Campus nodes (drawn on top of route lines) */}
            {data.campuses.map((campus) => {
              const pos = positions.get(campus.id);
              if (!pos) return null;
              const lbl = labelOffset(pos);
              const routeCount = data.routes.filter((r) =>
                r.stops.some((s) => s.campusId === campus.id),
              ).length;
              const routeNames = data.routes
                .filter((r) => r.stops.some((s) => s.campusId === campus.id))
                .map((r) => r.descriptionPrimary);

              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: SVG group with hover interaction
                <g
                  key={campus.id}
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setTooltip({
                      svgX: pos.x,
                      svgY: pos.y - NODE_R - 8,
                      lines: [
                        campus.namePrimary,
                        ...(campus.nameSecondary ? [campus.nameSecondary] : []),
                        `${routeCount} route${routeCount !== 1 ? "s" : ""}`,
                        ...routeNames,
                      ],
                      color: "currentColor",
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
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

          {/* Floating tooltip positioned over SVG */}
          {tooltip && (
            <div
              className="-translate-x-1/2 -translate-y-full pointer-events-none absolute z-50 rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-xs shadow-lg"
              style={{
                left: `${(tooltip.svgX / SVG_W) * 100}%`,
                top: `${(tooltip.svgY / SVG_H) * 100}%`,
              }}
            >
              <div className="flex items-start gap-2">
                {tooltip.color !== "currentColor" && (
                  <span
                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: tooltip.color }}
                  />
                )}
                <div className="space-y-0.5">
                  {tooltip.lines.map((line) => (
                    <p
                      key={line}
                      className={cn(
                        tooltip.lines.indexOf(line) === 0
                          ? "font-medium"
                          : "text-[10px] text-muted-foreground",
                      )}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="rounded-xl border border-border/60 bg-card/80 p-4">
            <h3 className="mb-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-widest">
              {t("legend.title")}
            </h3>
            <div className="space-y-1.5">
              {data.routes.map((route) => {
                const color = routeColor(route.routeId, allRouteIds);
                const isHovered = hoveredRoute === route.routeId;
                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: legend item with hover interaction
                  <div
                    key={route.routeId}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors",
                      isHovered && "bg-accent",
                    )}
                    onMouseEnter={() => setHoveredRoute(route.routeId)}
                    onMouseLeave={() => setHoveredRoute(null)}
                  >
                    <span
                      className="h-2 w-6 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-xs">
                      {route.descriptionPrimary}
                    </span>
                  </div>
                );
              })}
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
                    // biome-ignore lint/a11y/noStaticElementInteractions: trip card with hover interaction
                    <div
                      key={trip.tripId}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border border-border/30 bg-background/50 px-3 py-2 transition-colors",
                        hoveredRoute === trip.routeId && "bg-accent/50",
                      )}
                      onMouseEnter={() => setHoveredRoute(trip.routeId)}
                      onMouseLeave={() => setHoveredRoute(null)}
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
