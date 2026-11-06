// Snapshot web sources so Playwright never shares generated files, env files or a dev lock.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const workspace = fileURLToPath(new URL("../../../", import.meta.url));
const original = path.join(workspace, "apps/web"), require = createRequire(path.join(original, "package.json"));
const port = Number(process.argv[2]);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error("Puerto de prueba no válido.");
const isolated = path.join(workspace, ".tmp", `playwright-web-${process.pid}`);
fs.mkdirSync(isolated, { recursive: true });
for (const file of ["package.json", "next.config.ts", "tsconfig.json", "postcss.config.mjs"]) fs.copyFileSync(path.join(original, file), path.join(isolated, file));
fs.symlinkSync(path.join(original, "node_modules"), path.join(isolated, "node_modules"), process.platform === "win32" ? "junction" : "dir");
for (const directory of ["src", "public"]) fs.cpSync(path.join(original, directory), path.join(isolated, directory), { recursive: true });
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: isolated, stdio: "inherit", windowsHide: true,
  env: { ...process.env, NODE_ENV: "development", API_MODE: "mock", APP_ENV: "test", SUPABASE_URL: "", SUPABASE_PUBLISHABLE_KEY: "", NEXT_TELEMETRY_DISABLED: "1" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => { process.exitCode = code ?? 1; });
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
