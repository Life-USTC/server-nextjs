import {
  fetchRequiredLifeUstcStaticJson,
  getLifeUstcStaticUrl,
} from "@/lib/static-assets";
import type { BusStaticPayload } from "./bus-types";

const BUS_DATA_FILE = "bus_data_v3.json";

export function getBusDataUrl() {
  return getLifeUstcStaticUrl(BUS_DATA_FILE);
}

export async function loadBusStaticPayload() {
  return await fetchRequiredLifeUstcStaticJson<BusStaticPayload>(BUS_DATA_FILE);
}
