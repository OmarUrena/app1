import { readEnvironment } from "@/lib/config";
import type { RaffleView } from "./types";

export async function getCatalog(): Promise<{ mode: "mock" | "live"; items: RaffleView[] }> {
  const { mode } = readEnvironment(process.env);
  if (mode === "live") return { mode, items: [] };
  // Mock data is loaded only in explicitly configured local/test mode.
  const { demoRaffles } = await import("@/fixtures/catalog");
  return { mode, items: demoRaffles };
}
