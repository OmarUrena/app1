// Optional integration against the actual B2 NestJS application and an isolated local DB.
// Reuses B2's tested setup/cleanup, including ephemeral Auth/media fixtures for admin calls.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const frontend = fileURLToPath(new URL("../../../..", import.meta.url));
const backend = path.resolve(process.env.BACKEND_CHECKOUT || frontend);
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL local requerida; usar una instancia PostgreSQL de pruebas.");
const backendRequire = createRequire(path.join(backend, "apps/api/package.json"));
const webRequire = createRequire(path.join(frontend, "apps/web/package.json"));
const testFile = path.join(backend, "apps/api/test/catalog.integration.ts");
let source = fs.readFileSync(testFile, "utf8");
const end = source.indexOf("test('JWT ausente");
if (end < 0) throw new Error("Cambió el setup B2. Revisar el harness antes de ejecutarlo.");
source = source.slice(0, end);
source = source.replace(/from '([^']+)'/g, (_, name) => "from " + JSON.stringify(name.startsWith("../") ? path.resolve(path.dirname(testFile), name).replaceAll("\\", "/") : name.startsWith("node:") ? name : backendRequire.resolve(name).replaceAll("\\", "/")));
source = source.replace("import 'reflect-metadata';", "import " + JSON.stringify(backendRequire.resolve("reflect-metadata").replaceAll("\\", "/")) + ";");
source = source.replace("await app.listen(0,'127.0.0.1');base=await app.getUrl();", "await app.listen(3106,'127.0.0.1');base=await app.getUrl();");
source += `
test('F2 navegador con NestJS y PostgreSQL reales: vacío, paginación, detalle, pausa, edición y caída', async () => {
  const {chromium, firefox, webkit} = require(${JSON.stringify(webRequire.resolve("@playwright/test"))});
  const {mkdirSync} = require('node:fs');
  const output = ${JSON.stringify(path.join(frontend, "docs/frontend/screenshots/f2"))};
  mkdirSync(output,{recursive:true});
  const browsers = [];
  try {
    const browser = await chromium.launch(); browsers.push(browser);
    const page = await browser.newPage({viewport:{width:390,height:844}});
    await page.goto('http://127.0.0.1:3105/rifas');
    await page.getByRole('heading',{name:'Todavía no hay rifas publicadas'}).waitFor();
    await page.screenshot({path:output+'/vacio-mobile.png',fullPage:true});
    let id, slug;
    for(let index=0;index<13;index++) {
      const payload = {...input(),title:'PREMIO TEST F2 '+index};
      const created = await request('admin/raffles',{method:'POST',body:payload}); assert.equal(created.status,201);
      const raffle = await created.json(); id=raffle.id; slug=raffle.slug;
      assert.equal((await request('admin/raffles/'+id+'/publish',{method:'POST',body:approval})).status,200);
    }
    await page.goto('http://127.0.0.1:3105/rifas');
    await page.getByRole('article').first().waitFor();
    assert.equal(await page.getByRole('article').count(),12);
    assert.equal(await page.getByText('DEMO',{exact:true}).count(),0);
    assert.equal(await page.getByRole('searchbox').count(),0);
    await page.screenshot({path:output+'/catalogo-mobile.png',fullPage:true});
    await page.getByRole('link',{name:'Página siguiente'}).click();
    await page.waitForURL('**/rifas?page=2');
    await page.getByText('Página 2 de 2',{exact:false}).waitFor();
    assert.equal(await page.getByRole('article').count(),1);
    await db.query('BEGIN');
    try {
      for (const [number, interval] of [[0,'1 hour'],[1,'-1 hour']]) {
        const hold=randomUUID();
        await db.query("INSERT INTO sorteos.checkout_holds(id,raffle_id,session_id,quantity,unit_price_minor_snapshot,rules_version_snapshot,created_at,expires_at,idempotency_key,request_hash) VALUES ($1,$2,'00000000-0000-4000-8000-000000000400',1,10025,'TEST-B2-1',now()-interval '2 hours',now()+$3::interval,$4,$5)",[hold,id,interval,randomUUID(),'a'.repeat(64)]);
        await db.query("UPDATE sorteos.tickets SET status='HELD',hold_id=$1 WHERE raffle_id=$2 AND number=$3",[hold,id,number]);
      }
      await db.query('COMMIT');
    } catch(error) { await db.query('ROLLBACK'); throw error; }
    for (const [engine,label,width] of [[chromium,'desktop',1280],[firefox,'firefox',1280],[webkit,'webkit-mobile',390]]) {
      const actual = await engine.launch(); browsers.push(actual);
      const view = await actual.newPage({viewport:{width,height:900}});
      await view.goto('http://127.0.0.1:3105/rifas/'+slug);
      await view.getByRole('heading',{name:'PREMIO TEST F2 12',exact:true}).waitFor();
      assert.equal(await view.getByRole('progressbar').getAttribute('aria-valuenow'),'0');
      assert.equal(await view.getByRole('button',{name:'Compra no habilitada todavía'}).isDisabled(),true);
      assert.equal(await view.getByText('Imagen conceptual · DEMO',{exact:true}).count(),0);
      await view.getByText('Cupo consultado:',{exact:false}).waitFor();
      assert.equal(await view.getByText('Disponibles',{exact:true}).locator('..').locator('dd').textContent(),'9');
      assert.equal(await view.getByText('Cupo temporal',{exact:true}).locator('..').locator('dd').textContent(),'1');
      assert.equal(await view.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
      await view.screenshot({path:output+'/detalle-'+label+'.png',fullPage:true});
      await actual.close();
    }
    assert.equal((await request('admin/raffles/'+id+'/pause',{method:'POST'})).status,200);
    await page.goto('http://127.0.0.1:3105/rifas/'+slug);
    await page.getByRole('heading',{name:'No encontramos esta página'}).waitFor();
    assert.equal((await request('admin/raffles/'+id,{method:'PATCH',body:{title:'PREMIO TEST F2 EDITADO'}})).status,200);
    assert.equal((await request('admin/raffles/'+id+'/resume',{method:'POST',body:approval})).status,200);
    await page.goto('http://127.0.0.1:3105/rifas/'+slug);
    await page.getByRole('heading',{name:'PREMIO TEST F2 EDITADO',exact:true}).waitFor();
    await page.getByRole('button',{name:'Actualizar cupo'}).click();
    await page.getByText('RD$ 100.25',{exact:true}).waitFor();
    await app.close();
    await page.goto('http://127.0.0.1:3105/rifas');
    await page.getByText('El catálogo no está disponible',{exact:true}).waitFor();
    assert.equal(await page.getByRole('article').count(),0);
    await page.screenshot({path:output+'/error-mobile.png',fullPage:true});
    app = await createApp(parseConfig({NODE_ENV:'test',LOG_LEVEL:'silent',SWAGGER_ENABLED:'false',RATE_LIMIT:'1000',DATABASE_URL:dbUrl,DATABASE_SSL:'false',SUPABASE_URL:issuer,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'}));
    await app.listen(3106,'127.0.0.1');
    await page.getByRole('button',{name:'Volver a intentar'}).click();
    await page.getByRole('article').first().waitFor();
    assert.equal(await page.getByRole('article').count(),12);
    await app.close();
    app = await createApp(parseConfig({NODE_ENV:'test',LOG_LEVEL:'silent',SWAGGER_ENABLED:'false',RATE_LIMIT:'1',RATE_TTL_MS:'60000',DATABASE_URL:dbUrl,DATABASE_SSL:'false',SUPABASE_URL:issuer,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'}));
    await app.listen(3106,'127.0.0.1');
    await fetch(base+'/api/v1/raffles');
    await page.reload();
    await page.getByText('Demasiadas solicitudes; inténtalo más tarde.',{exact:true}).waitFor();
    assert.equal(await page.getByRole('article').count(),0);
    await page.screenshot({path:output+'/limite-mobile.png',fullPage:true});
  } finally { for(const browser of browsers) await browser.close(); }
});
`;
const temporary = path.join(backend, ".tmp/f2-live.integration.ts");
fs.writeFileSync(temporary, source);
const result = spawnSync(process.execPath, ["-r", backendRequire.resolve("ts-node/register"), "--test", temporary], {
  cwd: backend, stdio: "inherit", env: { ...process.env, NODE_ENV: "test", TS_NODE_TRANSPILE_ONLY: "true", TS_NODE_PROJECT: path.join(backend, "apps/api/tsconfig.json") },
});
process.exitCode = result.status ?? 1;
