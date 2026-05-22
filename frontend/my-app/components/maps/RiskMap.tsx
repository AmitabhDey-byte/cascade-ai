"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { GeoJSONSource, Map as MapboxMap, MapLayerMouseEvent } from "mapbox-gl";

import { useRiskData } from "@/hooks/userRiskData";
import { useSpeciesData } from "@/hooks/userSpeciesData";
import { DEFAULT_VIEW, MAPBOX_STYLE, MAPBOX_TOKEN, SUNDARBANS_BOUNDS } from "@/lib/mapbox";
import { riskLabel, tileScore } from "@/lib/api";
import type { Horizon, RiskTile } from "@/types";

const HORIZONS: Horizon[] = ["24H", "48H", "72H"];

const FALLBACK_BOUNDS: Record<string, [number, number, number, number]> = {
  sundarbans_tile_01: [88.0, 21.5, 88.5, 22.0],
  sundarbans_tile_02: [88.5, 21.5, 89.0, 22.0],
  sundarbans_tile_03: [89.0, 21.5, 89.5, 22.0],
  sundarbans_tile_04: [88.0, 22.0, 88.5, 22.5],
  sundarbans_tile_05: [88.5, 22.0, 89.0, 22.5],
  sundarbans_tile_06: [89.0, 22.0, 89.5, 22.5],
};

type BasinFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon,
  {
    tile_id: string;
    score: number;
    label: string;
    fillColor: string;
  }
>;

export default function RiskMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<Horizon>("24H");

  const { tiles, loading, error, highRiskCount, triggerPipeline, lastUpdated } = useRiskData();
  const { species } = useSpeciesData(selectedAreaId);

  const selectedArea = tiles.find((tile) => tile.tile_id === selectedAreaId) ?? null;
  const sourceData = useMemo(() => buildFeatureCollection(tiles, horizon), [tiles, horizon]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [DEFAULT_VIEW.longitude, DEFAULT_VIEW.latitude],
      zoom: DEFAULT_VIEW.zoom,
      pitch: 48,
      bearing: -12,
      maxBounds: SUNDARBANS_BOUNDS,
      attributionControl: false,
    });
    (window as unknown as { __cascadeMap?: MapboxMap }).__cascadeMap = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      map.addSource("risk-areas", {
        type: "geojson",
        data: sourceData,
      });

      map.addLayer({
        id: "risk-fill",
        type: "fill",
        source: "risk-areas",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.68,
            0.42,
          ],
        },
      });

      map.addLayer({
        id: "risk-outline",
        type: "line",
        source: "risk-areas",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#ffffff",
            ["get", "fillColor"],
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            3,
            1.5,
          ],
          "line-opacity": 0.88,
        },
      });

      map.addLayer({
        id: "risk-labels",
        type: "symbol",
        source: "risk-areas",
        layout: {
          "text-field": ["concat", ["get", "label"], "\n", ["to-string", ["get", "score"]]],
          "text-size": 11,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#f8fafc",
          "text-halo-color": "#020617",
          "text-halo-width": 1.4,
          "text-opacity": 0.92,
        },
      });

      map.on("click", "risk-fill", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const tileId = String(feature?.properties?.tile_id ?? "");
        if (!tileId) return;
        setSelectedAreaId((current) => (current === tileId ? null : tileId));
        if (feature?.geometry.type === "Polygon") {
          const center = polygonCenter(feature.geometry.coordinates[0] as [number, number][]);
          map.easeTo({ center, zoom: Math.max(map.getZoom(), 9.6), duration: 700 });
        }
      });

      map.on("mouseenter", "risk-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "risk-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [sourceData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const source = map.getSource("risk-areas") as GeoJSONSource | undefined;
    source?.setData(sourceData);
  }, [mapReady, sourceData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !map.isStyleLoaded()) return;

    for (const feature of sourceData.features) {
      if (feature.id === undefined) continue;
      const selector = { source: "risk-areas", id: feature.id } as Parameters<MapboxMap["setFeatureState"]>[0];
      map.setFeatureState(selector, { selected: feature.id === selectedAreaId });
    }
  }, [mapReady, selectedAreaId, sourceData]);

  const avgRisk = tiles.length
    ? tiles.reduce((total, tile) => total + tileScore(tile, horizon), 0) / tiles.length
    : 0;
  const highest = [...tiles].sort((a, b) => tileScore(b, horizon) - tileScore(a, horizon))[0];
  const selectArea = (tile: RiskTile) => {
    setSelectedAreaId((current) => (current === tile.tile_id ? null : tile.tile_id));
    const map = mapRef.current;
    if (map) {
      map.easeTo({ center: [(tile.lon_min + tile.lon_max) / 2, (tile.lat_min + tile.lat_max) / 2], zoom: 9.7, duration: 700 });
    }
  };

  return (
    <div className="h-full min-h-[520px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#06100f]">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] bg-black/35 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[9px] tracking-[0.25em] text-white/35">SUNDARBANS DELTA BASIN</div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="text-sm font-black tracking-[0.18em] text-white">LIVE FLOOD INTELLIGENCE</span>
            <span className="rounded border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[8px] tracking-[0.18em] text-emerald-300">
              {loading ? "UPDATING" : "READY"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-white/[0.1]">
            {HORIZONS.map((item) => (
              <button
                key={item}
                onClick={() => setHorizon(item)}
                className={`h-8 px-3 text-[9px] tracking-[0.18em] transition ${
                  horizon === item ? "bg-emerald-400/20 text-emerald-300" : "bg-black/20 text-white/38 hover:text-white/70"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            onClick={() => void triggerPipeline()}
            disabled={loading}
            className="h-8 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 text-[9px] tracking-[0.18em] text-emerald-300 transition hover:bg-emerald-400/18 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? "RUNNING" : "RUN PREDICTION"}
          </button>
        </div>
      </div>

      <div className="grid h-[calc(100%-69px)] min-h-[450px] grid-cols-1 lg:grid-cols-[1fr_300px]">
        <div className="relative min-h-[390px]">
          {MAPBOX_TOKEN ? (
            <div ref={containerRef} className="absolute inset-0" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-center">
              <div>
                <div className="text-[10px] tracking-[0.25em] text-amber-300">MAPBOX TOKEN MISSING</div>
                <div className="mt-2 text-[9px] tracking-[0.12em] text-white/35">Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local</div>
              </div>
            </div>
          )}

          <svg className="absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {tiles.map((tile, index) => {
              const score = tileScore(tile, horizon);
              const selected = tile.tile_id === selectedAreaId;
              const center = zoneCenter(tile);
              return (
                <g key={tile.tile_id}>
                  <polygon
                    points={zonePoints(tile, index)}
                    fill={colorForScore(score)}
                    opacity={selected ? 0.58 : 0.34}
                    stroke={selected ? "#ffffff" : colorForScore(score)}
                    strokeWidth={selected ? 0.55 : 0.28}
                    vectorEffect="non-scaling-stroke"
                    className="pointer-events-auto cursor-pointer transition-opacity hover:opacity-70"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      selectArea(tile);
                    }}
                  />
                  <text
                    x={center[0]}
                    y={center[1]}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#f8fafc"
                    fontSize="2.3"
                    fontWeight="800"
                    opacity="0.86"
                    className="pointer-events-none"
                  >
                    {score.toFixed(2)}
                  </text>
                </g>
              );
            })}
          </svg>

          {tiles.map((tile) => {
            const [left, top, width, height] = zoneBox(tile);
            return (
              <button
                key={`hit-${tile.tile_id}`}
                aria-label={`Select ${tile.tile_id}`}
                title={`Select ${tile.tile_id}`}
                onClick={() => selectArea(tile)}
                className="absolute z-20 rounded-sm border border-transparent bg-transparent transition hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
              />
            );
          })}

          <div className="pointer-events-none absolute left-4 top-4 z-30 grid gap-2 sm:grid-cols-3">
            {[
              { label: "AVG RISK", value: avgRisk.toFixed(2), color: colorForScore(avgRisk) },
              { label: "HIGH-RISK AREAS", value: String(highRiskCount), color: "#f97316" },
              { label: "AREAS TRACKED", value: String(tiles.length), color: "#38bdf8" },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-white/[0.08] bg-black/50 px-3 py-2 backdrop-blur-md">
                <div className="text-base font-black" style={{ color: item.color }}>{item.value}</div>
                <div className="mt-0.5 text-[7px] tracking-[0.18em] text-white/35">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 z-30 flex flex-wrap gap-2">
            {[
              ["CRITICAL", "#ef4444"],
              ["HIGH", "#f59e0b"],
              ["MODERATE", "#eab308"],
              ["LOW", "#10b981"],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-black/45 px-2.5 py-1.5 backdrop-blur-md">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[7px] tracking-[0.16em] text-white/40">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="border-t border-white/[0.07] bg-black/30 p-4 lg:border-l lg:border-t-0">
          <div className="text-[9px] font-bold tracking-[0.25em] text-white/35">AREA INTEL</div>

          {selectedArea ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-[8px] tracking-[0.2em] text-white/28">SELECTED AREA</div>
                <div className="mt-1 break-all text-sm font-black tracking-[0.08em] text-white/80">{selectedArea.tile_id}</div>
              </div>

              <RiskGauge score={tileScore(selectedArea, horizon)} horizon={horizon} />

              <div className="grid grid-cols-3 gap-2">
                {HORIZONS.map((item) => (
                  <div key={item} className="rounded-md border border-white/[0.06] bg-white/[0.03] p-2">
                    <div className="text-[7px] tracking-[0.18em] text-white/25">{item}</div>
                    <div className="mt-1 text-sm font-black text-white/70">{tileScore(selectedArea, item).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-[8px] tracking-[0.12em] text-white/45">
                <InfoRow label="SOIL MOISTURE" value={selectedArea.risk_score >= 0 ? "LIVE NASA FEED" : "WAITING"} />
                <InfoRow label="FORECAST" value={riskLabel(tileScore(selectedArea, horizon))} />
                <InfoRow label="UPDATED" value={new Date(selectedArea.updated_at).toLocaleTimeString()} />
              </div>

              <div className="rounded-md border border-emerald-400/16 bg-emerald-400/[0.04] p-3">
                <div className="text-[8px] tracking-[0.2em] text-emerald-300/70">SPECIES SIGNALS</div>
                <div className="mt-2 space-y-2">
                  {species.length > 0 ? species.map((item) => (
                    <div key={`${item.species_name}-${item.tile_id}`} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      <span className="min-w-0 flex-1 truncate text-[8px] text-white/62">{item.species_name}</span>
                      <span className={`rounded border px-1.5 py-0.5 text-[7px] ${item.iucn_status === "CR" || item.iucn_status === "EN" ? "border-red-400/35 text-red-300" : "border-white/10 text-white/35"}`}>
                        {item.iucn_status}
                      </span>
                    </div>
                  )) : (
                    <div className="text-[8px] leading-relaxed text-white/30">No confirmed species observations are attached to this area yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10 space-y-4">
              <div>
                <div className="text-2xl font-black" style={{ color: highest ? colorForScore(tileScore(highest, horizon)) : "#34d399" }}>
                  {highest ? tileScore(highest, horizon).toFixed(2) : "0.00"}
                </div>
                <div className="mt-1 text-[8px] tracking-[0.18em] text-white/35">HIGHEST CURRENT FORECAST</div>
                <div className="mt-2 break-all text-[9px] font-mono text-white/55">{highest?.tile_id ?? "Run prediction to load monitored areas"}</div>
              </div>

              <div className="rounded-md border border-white/[0.07] bg-white/[0.03] p-3">
                <div className="text-[8px] tracking-[0.18em] text-white/35">INTERACTION</div>
                <div className="mt-2 text-[8px] leading-relaxed text-white/42">
                  Click any colored basin area to inspect forecast probability, endangered species overlap, and field response context.
                </div>
              </div>
            </div>
          )}

          {error && <div className="mt-4 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-[8px] leading-relaxed text-red-200">{error}</div>}
          {lastUpdated && <div className="mt-4 text-[7px] tracking-[0.16em] text-white/18">LAST SYNC {lastUpdated.toLocaleTimeString()}</div>}
        </aside>
      </div>
    </div>
  );
}

function RiskGauge({ score, horizon }: { score: number; horizon: Horizon }) {
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[8px] tracking-[0.18em] text-white/28">{horizon} FLOOD PROBABILITY</div>
          <div className="mt-1 text-4xl font-black tracking-[0.08em]" style={{ color: colorForScore(score) }}>{score.toFixed(2)}</div>
        </div>
        <div className="mb-1 text-[9px] tracking-[0.16em]" style={{ color: colorForScore(score) }}>{riskLabel(score)}</div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(score * 100, 100)}%`, backgroundColor: colorForScore(score) }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/25">{label}</span>
      <span className="min-w-0 truncate text-right text-white/58">{value}</span>
    </div>
  );
}

function buildFeatureCollection(tiles: RiskTile[], horizon: Horizon): BasinFeatureCollection {
  return {
    type: "FeatureCollection",
    features: tiles.map((tile) => {
      const bounds = getBounds(tile);
      const score = tileScore(tile, horizon);
      return {
        type: "Feature",
        id: tile.tile_id,
        properties: {
          tile_id: tile.tile_id,
          score: Number(score.toFixed(2)),
          label: shortAreaLabel(tile.tile_id),
          fillColor: colorForScore(score),
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [bounds[0], bounds[1]],
            [bounds[2], bounds[1]],
            [bounds[2], bounds[3]],
            [bounds[0], bounds[3]],
            [bounds[0], bounds[1]],
          ]],
        },
      };
    }),
  };
}

function getBounds(tile: RiskTile): [number, number, number, number] {
  const fallback = FALLBACK_BOUNDS[tile.tile_id] ?? [tile.lon_min, tile.lat_min, tile.lon_max, tile.lat_max];
  return [
    finiteOr(tile.lon_min, fallback[0]),
    finiteOr(tile.lat_min, fallback[1]),
    finiteOr(tile.lon_max, fallback[2]),
    finiteOr(tile.lat_max, fallback[3]),
  ];
}

function zonePoints(tile: RiskTile, index: number): string {
  const [minLng, minLat, maxLng, maxLat] = getBounds(tile);
  const left = lonToPct(minLng);
  const right = lonToPct(maxLng);
  const top = latToPct(maxLat);
  const bottom = latToPct(minLat);
  const wobble = 1.4 + (index % 3) * 0.7;
  const points = [
    [left + wobble, top + 0.8],
    [right - 0.6, top + wobble],
    [right - wobble, bottom - 0.7],
    [left + 0.7, bottom - wobble],
  ];
  return points.map((point) => point.join(",")).join(" ");
}

function zoneCenter(tile: RiskTile): [number, number] {
  const [minLng, minLat, maxLng, maxLat] = getBounds(tile);
  return [lonToPct((minLng + maxLng) / 2), latToPct((minLat + maxLat) / 2)];
}

function zoneBox(tile: RiskTile): [number, number, number, number] {
  const [minLng, minLat, maxLng, maxLat] = getBounds(tile);
  const left = lonToPct(minLng);
  const right = lonToPct(maxLng);
  const top = latToPct(maxLat);
  const bottom = latToPct(minLat);
  return [left, top, right - left, bottom - top];
}

function lonToPct(lon: number): number {
  const [west] = SUNDARBANS_BOUNDS[0];
  const [east] = SUNDARBANS_BOUNDS[1];
  return ((lon - west) / (east - west)) * 100;
}

function latToPct(lat: number): number {
  const [, south] = SUNDARBANS_BOUNDS[0];
  const [, north] = SUNDARBANS_BOUNDS[1];
  return (1 - ((lat - south) / (north - south))) * 100;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value !== 0 ? value : fallback;
}

function colorForScore(score: number): string {
  if (score >= 0.8) return "#ef4444";
  if (score >= 0.65) return "#f59e0b";
  if (score >= 0.45) return "#eab308";
  if (score >= 0.25) return "#10b981";
  return "#22c55e";
}

function shortAreaLabel(tileId: string): string {
  const match = tileId.match(/(\d+)$/);
  return match ? `A-${match[1]}` : tileId.replace("sundarbans_", "").replaceAll("_", "-").toUpperCase();
}

function polygonCenter(points: [number, number][]): [number, number] {
  const usable = points.slice(0, -1);
  const totals = usable.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]] as [number, number],
    [0, 0] as [number, number],
  );
  return [totals[0] / usable.length, totals[1] / usable.length];
}
