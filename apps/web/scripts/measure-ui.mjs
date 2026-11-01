import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

// A local development observation, not a Lighthouse score or production benchmark.
const browser = await chromium.launch({ headless: true });
const samples = [];
try {
  for (const width of [360, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3000/", { waitUntil: "load" });
    if (!await page.getByText("DEMO · Sin transacciones reales", { exact: true }).isVisible()) throw new Error("La medición requiere el servidor demo local.");
    await page.locator(".hero-photo").evaluate(image => image.decode());
    const timing = await page.evaluate(async () => {
      let lcp = null;
      const observer = new PerformanceObserver(list => { lcp = list.getEntries().at(-1)?.startTime ?? null; });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      observer.disconnect();
      const navigation = performance.getEntriesByType("navigation")[0];
      const images = performance.getEntriesByType("resource").filter(entry => entry.name.includes("/_next/image"));
      return {
        domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
        responseEndMs: Math.round(navigation.responseEnd),
        firstContentfulPaintMs: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0),
        largestContentfulPaintMs: lcp === null ? null : Math.round(lcp),
        imageEncodedBytesAtMeasurement: images.reduce((total, entry) => total + entry.encodedBodySize, 0),
        imageRequestsAtMeasurement: images.length,
      };
    });
    samples.push({ width, ...timing });
    await context.close();
  }
} finally { await browser.close(); }

const result = {
  date: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
  route: "/",
  environment: "Local Next.js development; Chromium; no CPU/network throttling. Server and image optimizer already warmed by E2E. One fresh browser context per viewport. These samples are not production benchmarks or Lighthouse results.",
  samples,
};
await writeFile(new URL("../../../docs/frontend/PERFORMANCE_F1.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
