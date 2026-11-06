import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(process.env.NODE_MODULES_PATH ? path.join(path.resolve(process.env.NODE_MODULES_PATH), '__resume_test__.cjs') : import.meta.url);
const { chromium } = require('playwright');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const scriptDirectory = await realpath(path.dirname(fileURLToPath(import.meta.url)));
const extensionDirectory = await realpath(path.join(scriptDirectory, '..', 'src'));
const profileDirectory = await mkdtemp(path.join(scriptDirectory, '.mv3-profile-'));
const executablePath = process.env.BROWSER_PATH || undefined;
let context;
let report;

async function cleanupProfile() {
  const resolved = await realpath(profileDirectory);
  if (path.dirname(resolved) !== scriptDirectory || !path.basename(resolved).startsWith('.mv3-profile-')) {
    throw new Error('临时浏览器配置路径超出预期目录，已拒绝删除。');
  }
  await rm(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
}

try {
    context = await chromium.launchPersistentContext(profileDirectory, {
      executablePath,
      headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [`--disable-extensions-except=${extensionDirectory}`, `--load-extension=${extensionDirectory}`, '--no-first-run'],
    });
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 10_000 }).catch(() => null);
    if (!worker) {
      throw new Error('浏览器未加载扩展。请通过 BROWSER_PATH 指定支持加载已解压扩展的 Edge 或 Chromium；部分正式版 Chrome 会忽略命令行加载扩展参数。');
    }
    const workerState = await worker.evaluate(async () => ({
      id: chrome.runtime.id,
      manifest: chrome.runtime.getManifest(),
      panelBehavior: await chrome.sidePanel.getPanelBehavior(),
    }));
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const remoteRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('request', (request) => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
    await page.goto(`chrome-extension://${workerState.id}/index.html`);
    await page.waitForSelector('#resume-file');
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);
    document.addPage().drawText('Example Resume\nEmail: mv3@example.com', { font, size: 12, x: 50, y: 700 });
    const pdf = [...await document.save()];
    const result = await page.evaluate(async (pdf) => {
      const { importResumeFile } = await import('./lib/importer.js');
      const imported = await importResumeFile(new File([new Uint8Array(pdf)], 'resume.pdf'));
      await chrome.storage.local.set({ smokeTest: { name: 'MV3 test' } });
      const saved = await chrome.storage.local.get('smokeTest');
      await chrome.storage.local.remove('smokeTest');
      return { imported, saved, title: document.title, protocol: location.protocol };
    }, pdf);
    await page.locator('#resume-file').setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) });
    await page.waitForFunction(() => document.querySelector('#import-status').textContent.includes('已读取到本机'));
    assert.equal(await page.locator('#profile-basic-email').inputValue(), 'mv3@example.com');
    await page.locator('#save-profile').click();
    await page.waitForFunction(() => document.querySelector('#profile-state').textContent === '已保存在本机');
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#profile-basic-email')?.value === 'mv3@example.com');
    const uiResult = await page.evaluate(async () => ({
      status: document.querySelector('#profile-state').textContent,
      saved: (await chrome.storage.local.get('resumeFillProfile')).resumeFillProfile,
    }));
    assert.match(result.imported.text, /mv3@example\.com/);
    assert.equal(result.protocol, 'chrome-extension:');
    assert.equal(workerState.panelBehavior.openPanelOnActionClick, true);
    assert.equal(result.saved.smokeTest.name, 'MV3 test');
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(remoteRequests, []);
    assert.deepEqual(consoleErrors, []);
    report = { executablePath: executablePath || 'Playwright Chromium', status: 'passed', workerState, result, uiResult, pageErrors, consoleErrors, remoteRequests };
} catch (error) {
    report = { executablePath: executablePath || 'Playwright Chromium', status: 'failed', error: error.stack };
} finally {
  try {
    if (context) await context.close();
  } finally {
    await cleanupProfile();
  }
}
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'passed') process.exitCode = 1;
