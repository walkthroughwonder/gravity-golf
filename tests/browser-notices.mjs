// Real public files, local dependency fixtures, and no provider/account requests.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = new URL('../dist/', import.meta.url);
const mobile = new URL('file:///Users/edwin/Downloads/Gravity%20Golf/mobile/');
const output = process.env.GG_QA_OUTPUT || '/tmp/gravitygolf-notices-browser';
const origin = 'https://notice-fixture.invalid';
const files = ['index.html', 'third-party-notices.html', 'commerce-client.mjs', 'funnel-analytics.mjs', 'analytics-config.json', 'manifest.json', 'soundtrack.mp3', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'licenses/three-0.172.0-LICENSE.txt', 'licenses/firebase-10.12.0-LICENSE.txt', 'licenses/orbitron-OFL.txt', 'licenses/exo-2-OFL.txt'];
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = [];
try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const denied = [], errors = [];
    context.on('page', page => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      const fulfill = (body, contentType) => route.fulfill({ body, contentType });
      if (url.origin === origin) {
        const name = url.pathname.slice(1) || 'index.html';
        if (files.includes(name)) return fulfill(await readFile(new URL(name, root)), types[extname(name)]);
        if (name === 'api/commerce/status') return fulfill('{"available":false}', 'application/json');
        if (name === 'favicon.ico') return route.fulfill({ status: 204 });
      }
      if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/10.12.0/')) return fulfill('', 'text/javascript');
      if (url.origin === 'https://fonts.googleapis.com') return fulfill("@font-face{font-family:Orbitron;src:url(https://font-fixture.invalid/orbitron-latin-wght-normal.woff2)}@font-face{font-family:'Exo 2';src:url(https://font-fixture.invalid/exo-2-latin-wght-normal.woff2)}", 'text/css');
      if (url.origin === 'https://font-fixture.invalid' && /^\/(?:orbitron|exo-2)-latin-wght-normal\.woff2$/.test(url.pathname)) return fulfill(await readFile(new URL('www/fonts' + url.pathname, mobile)), 'font/woff2');
      const prefix = '/npm/three@0.172.0/';
      if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith(prefix)) {
        const file = url.pathname.slice(prefix.length);
        if (/^(?:build|examples\/jsm)\/[a-zA-Z0-9_./-]+\.js$/.test(file) && !file.includes('..')) return fulfill(await readFile(new URL('node_modules/three/' + file, mobile)), 'text/javascript');
      }
      denied.push(url.origin + url.pathname);
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(origin + '/');
    await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
    const link = page.locator('.notices-link:visible');
    assert.equal(await link.count(), 1);
    await link.focus();
    assert.equal(await link.evaluate(element => document.activeElement === element), true);
    const box = await link.boundingBox();
    assert.ok(box && box.width >= 24 && box.height >= 24 && box.y >= 0 && box.y + box.height <= viewport.height);
    assert.equal(await link.evaluate(element => { const r = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), true, 'Link must not be covered by another control');
    await page.screenshot({ path: `${output}/${viewport.width}-picker.png` });
    const popupPromise = context.waitForEvent('page');
    await link.click();
    const notice = await popupPromise;
    await notice.waitForLoadState();
    assert.equal(new URL(notice.url()).pathname, '/third-party-notices.html');
    assert.equal(await notice.evaluate(() => window.opener), null);
    assert.equal(page.isClosed(), false);
    assert.equal(await notice.locator('h1').innerText(), 'Third-party notices');
    assert.equal(await notice.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await notice.locator('script, iframe, link[rel="stylesheet"]').count(), 0);
    await notice.screenshot({ path: `${output}/${viewport.width}-notices.png`, fullPage: true });
    const licenses = await notice.locator('a.license').evaluateAll(elements => elements.map(element => element.href));
    assert.equal(licenses.length, 4);
    for (const url of licenses) {
      const response = await notice.goto(url);
      assert.equal(response.status(), 200);
      const expected = await readFile(new URL(new URL(url).pathname.slice(1), root), 'utf8');
      assert.equal(await response.text(), expected);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(denied, []);
    report.push({ viewport, visibleLink: true, keyboardFocus: true, separateTab: true, openerNull: true, licenseFiles: 4, horizontalOverflow: false, errors, denied });
    await context.close();
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
