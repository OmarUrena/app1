import { cache } from "react";
import { connection } from "next/server";
import { readEnvironment } from "@/lib/config";
import { ApiError } from "@/lib/api/errors";
import { catalogApi } from "./api";
import type { RaffleSummary } from "./types";

export async function getCatalog(page = 1) {
  await connection();
  const { mode, apiBaseUrl } = readEnvironment(process.env);
  if (mode === "mock") {
    const { demoRaffles } = await import("@/fixtures/catalog");
    return { mode, items: demoRaffles.map(item => ({ ...item, demo: true })), pagination: { page: 1, pageSize: 12, total: demoRaffles.length } };
  }
  try {
    if (!apiBaseUrl) throw new ApiError("NETWORK_ERROR", 0);
    return { mode, ...await catalogApi(apiBaseUrl, process.env.PUBLIC_PRIZE_IMAGE_BASE_URL).list(page) };
  } catch (error) {
    const failure = error instanceof ApiError ? error : new ApiError("NETWORK_ERROR", 0);
    return { mode, items: [] as RaffleSummary[], pagination: { page, pageSize: 12, total: 0 }, error: { message: failure.message, requestId: failure.requestId } };
  }
}

// Deduplication is scoped to this render, never shared across visitors.
export const getRaffle = cache(async (slug: string) => {
  await connection();
  const { mode, apiBaseUrl } = readEnvironment(process.env);
  if (mode === "mock") {
    const { demoRaffles } = await import("@/fixtures/catalog");
    const item = demoRaffles.find(item => item.slug === slug);
    return item ? { ...item, demo: true } : null;
  }
  if (!apiBaseUrl) throw new ApiError("NETWORK_ERROR", 0);
  try { return await catalogApi(apiBaseUrl, process.env.PUBLIC_PRIZE_IMAGE_BASE_URL).detail(slug); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
});
