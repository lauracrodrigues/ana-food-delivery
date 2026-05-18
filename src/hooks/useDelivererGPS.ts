// v2.0.0 — GPS só liga quando tem pedido (zero consumo em idle)
// Modos:
//   offline    → app fechado / fora do trabalho. Sem GPS, sem polling.
//   available  → entregador "bateu ponto" mas sem pedido. SEM GPS (em casa = sem consumo).
//                Apenas marca presença no servidor (1 RPC ao mudar status).
//   delivering → tem pedido atribuído. GPS ligado (alta acurácia).
// Throttle:
//   - distância <50m E intervalo mínimo → skip update
//   - bateria <15% → pausa automática + warning
//   - aba oculta → pausa (visibilitychange)
// Backend: chama RPC update_deliverer_location (server-side throttle + ownership)

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkStatus = "offline" | "available" | "delivering";

interface UseDelivererGPSOptions {
  delivererId: string | null;
  workStatus: WorkStatus;
  enabled: boolean;
}

// Config por estado: GPS só em delivering (zero consumo em available)
const GPS_CONFIGS: Record<WorkStatus, PositionOptions | null> = {
  offline:    null, // sem GPS
  available:  null, // sem GPS — só presença no servidor (entregador pode estar em casa)
  delivering: { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 },
};

const MIN_INTERVALS_MS: Record<WorkStatus, number> = {
  offline:    Infinity,
  available:  Infinity, // não dispara updates GPS
  delivering: 30_000,   // 30s entre envios
};

const MIN_DISTANCE_M = 50;
const LOW_BATTERY_THRESHOLD = 0.15;

// Haversine pra throttle no client
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function useDelivererGPS({ delivererId, workStatus, enabled }: UseDelivererGPSOptions) {
  const [batteryLow, setBatteryLow] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);

  // Bateria — pausa quando <15%
  useEffect(() => {
    const nav = navigator as any;
    if (!nav.getBattery) return; // iOS Safari não suporta — segue normal
    let battery: any = null;
    const onChange = () => {
      if (!battery) return;
      setBatteryLow(battery.level < LOW_BATTERY_THRESHOLD && !battery.charging);
    };
    nav.getBattery().then((b: any) => {
      battery = b;
      onChange();
      b.addEventListener("levelchange", onChange);
      b.addEventListener("chargingchange", onChange);
    });
    return () => {
      if (battery) {
        battery.removeEventListener("levelchange", onChange);
        battery.removeEventListener("chargingchange", onChange);
      }
    };
  }, []);

  // Visibilidade — pausa quando aba oculta (SO já pausa em background, mas reforça)
  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Sincroniza work_status no servidor sempre que muda (mesmo sem GPS)
  useEffect(() => {
    if (!delivererId || !enabled) return;
    // @ts-expect-error -- types não incluem RPC
    supabase.rpc("update_deliverer_location", {
      p_deliverer_id: delivererId,
      p_lat: lastSentRef.current?.lat ?? 0,
      p_lng: lastSentRef.current?.lng ?? 0,
      p_work_status: workStatus,
    }).then(() => {});
  }, [workStatus, delivererId, enabled]);

  // watchPosition principal
  useEffect(() => {
    if (!enabled || !delivererId || !navigator.geolocation) return;

    const effectiveStatus: WorkStatus =
      batteryLow || tabHidden ? "offline" : workStatus;

    const config = GPS_CONFIGS[effectiveStatus];
    if (!config) return; // offline: não inicia watch

    const minInterval = MIN_INTERVALS_MS[effectiveStatus];

    const sendLocation = async (lat: number, lng: number) => {
      const now = Date.now();
      const last = lastSentRef.current;
      if (last) {
        const dist = haversineM(last.lat, last.lng, lat, lng);
        if (dist < MIN_DISTANCE_M && now - last.ts < minInterval) return;
      }
      lastSentRef.current = { lat, lng, ts: now };
      // @ts-expect-error -- RPC não tipada
      await supabase.rpc("update_deliverer_location", {
        p_deliverer_id: delivererId,
        p_lat: lat,
        p_lng: lng,
        p_work_status: workStatus,
      });
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
      () => {}, // erros silenciosos
      config,
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, delivererId, workStatus, batteryLow, tabHidden]);

  return {
    batteryLow,
    tabHidden,
    // Estado efetivo (depois de overrides automáticos)
    effectiveStatus: (batteryLow || tabHidden ? "offline" : workStatus) as WorkStatus,
  };
}
