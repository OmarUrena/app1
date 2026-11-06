// Reuse the B5 real PostgreSQL/NestJS/JWKS/private-Storage fixture, failing closed if it changes.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const workspace = fileURLToPath(new URL("../../../..", import.meta.url));
const apiRequire = createRequire(path.join(workspace, "apps/api/package.json"));
const webRequire = createRequire(path.join(workspace, "apps/web/package.json"));
if (!process.env.TEST_DATABASE_URL) throw new Error("Se requiere PostgreSQL local de pruebas en TEST_DATABASE_URL.");
const fixture = path.join(workspace, "apps/api/test/payments.integration.ts");
let source = fs.readFileSync(fixture, "utf8").replace(/\r\n/g, "\n");
const end = source.indexOf("test('M4 sesi");
if (end < 0) throw new Error("Cambió el fixture B5; revisar el harness M4.");
source = source.slice(0, end).replace(/from '([^']+)'/g, (_, name) => "from " + JSON.stringify(name.startsWith(".") ? path.resolve(path.dirname(fixture), name).replaceAll("\\", "/") : name.startsWith("node:") ? name : apiRequire.resolve(name).replaceAll("\\", "/")));
source = source.replace("import 'reflect-metadata';", "import " + JSON.stringify(apiRequire.resolve("reflect-metadata").replaceAll("\\", "/")) + ";");
function replaceOnce(old, next) {
  if (source.split(old).length !== 2) throw new Error("Cambió el setup B5: " + old.slice(0, 45));
  source = source.replace(old, next);
}
replaceOnce("origin='http://localhost:3000'", "origin='http://127.0.0.1:3115'");
replaceOnce("const config=parseConfig({", "const config=parseConfig({CORS_ORIGINS:origin,");
// Root before hooks can overlap; explicitly await the DB/API fixture before starting Next.
replaceOnce("before(async()=>{", "async function setupFixture(){");
replaceOnce("});\nafter(async()=>{", "}\nafter(async()=>{");
replaceOnce("if(req.url==='/auth/v1/user'){", fs.readFileSync(new URL("./m4-auth-fixture.txt", import.meta.url), "utf8") + "\nif(req.url==='/auth/v1/user'){");
replaceOnce("JSON.stringify({id:verified.payload.sub,is_anonymous:false})", "JSON.stringify(await fixtureUser(String(verified.payload.sub)))");
source += `\nconst m4Workspace=${JSON.stringify(workspace)};\nconst m4WebRequire=require('node:module').createRequire(${JSON.stringify(path.join(workspace, "apps/web/package.json"))});\nconst m4Playwright=require(${JSON.stringify(webRequire.resolve("@playwright/test"))});\n`;
source += fs.readFileSync(new URL("./m4-browser-scenarios.txt", import.meta.url), "utf8");
fs.mkdirSync(path.join(workspace, ".tmp"), { recursive: true });
const temporary = path.join(workspace, ".tmp/m4-live.integration.ts");
fs.writeFileSync(temporary, source);
const result = spawnSync(process.execPath, ["-r", apiRequire.resolve("ts-node/register"), "--test", temporary], {
  cwd: workspace, stdio: "inherit", windowsHide: true,
  env: { ...process.env, NODE_ENV: "test", TS_NODE_TRANSPILE_ONLY: "true", TS_NODE_PROJECT: path.join(workspace, "apps/api/tsconfig.json") },
});
process.exitCode = result.status ?? 1;
