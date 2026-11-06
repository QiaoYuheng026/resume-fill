import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(process.env.NODE_MODULES_PATH ? path.join(path.resolve(process.env.NODE_MODULES_PATH), '__resume_test__.cjs') : import.meta.url);
const { chromium } = require('playwright');
const testDirectory = await realpath(path.dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = await realpath(path.join(testDirectory, '..', 'src'));
const temporaryDirectory = await mkdtemp(path.join(testDirectory, '.page-access-'));
const extensionDirectory = path.join(temporaryDirectory, 'extension');
const profileDirectory = path.join(temporaryDirectory, 'profile');
await cp(sourceDirectory, extensionDirectory, { recursive: true });
const originalManifest = await readFile(path.join(extensionDirectory, 'manifest.json'), 'utf8');
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html><html lang="zh-CN"><head><title>测试校招表单 ${request.url}</title></head><body><h1>个人信息</h1><form><label>姓名<input id="name" name="name" autocomplete="name"></label><label>电子邮箱<input id="email" name="email" type="email"></label><button type="submit">提交</button></form><script>window.submitCount=0;document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();window.submitCount+=1});</script></body></html>`);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const originPattern = `${baseUrl}/*`;
const executablePath = process.env.BROWSER_PATH || undefined;
const reports = [];
let context;

async function openExtension() {
  context = await chromium.launchPersistentContext(profileDirectory, {
    executablePath,
    headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extensionDirectory}`, `--load-extension=${extensionDirectory}`, '--no-first-run'],
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 10_000 });
  const extensionId = new URL(worker.url()).hostname;
  const app = await context.newPage();
  await app.goto(`chrome-extension://${extensionId}/index.html`);
  await app.waitForSelector('#profile-basic-name');
  return { app, extensionId };
}

async function closeContext() {
  if (context) {
    await context.close();
    context = null;
  }
}

async function setProfile(app) {
  await app.evaluate(async () => {
    await chrome.storage.local.set({ resumeFillProfile: { version: 1, basic: { name: '权限测试同学', email: 'permission@example.com' }, education: [], experience: [], projects: [], custom: [], rawText: '' } });
  });
  await app.reload();
  await app.waitForFunction(() => document.querySelector('#profile-state')?.textContent === '已保存在本机');
  await app.locator('#fill-tab').click();
}

async function activeId(app) {
  return app.evaluate(async () => {
    const { queryActiveTab } = await import('./lib/page-access.js');
    return (await queryActiveTab())?.id;
  });
}

async function clickWithoutSwitchingTab(app, selector) {
  const session = await context.newCDPSession(app);
  try {
    await session.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(selector)}).click()`, userGesture: true });
  } finally {
    await session.detach();
  }
}

async function cleanup() {
  const resolved = await realpath(temporaryDirectory);
  if (path.dirname(resolved) !== testDirectory || !path.basename(resolved).startsWith('.page-access-')) throw new Error('拒绝清理不符合预期的测试目录。');
  await rm(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
}

try {
  const { app } = await openExtension();
  await setProfile(app);
  const fixture = await context.newPage();
  await fixture.goto(`${baseUrl}/first`);
  await fixture.bringToFront();
  const tabId = await activeId(app);
  const initial = await app.evaluate(async (tabId) => {
    const { scanTab, queryActiveTab, permissionForTab } = await import('./lib/page-access.js');
    const tab = await queryActiveTab();
    try {
      await scanTab(tabId);
      return { code: 'unexpected-success', tab, permission: permissionForTab(tab) };
    } catch (error) {
      return { code: error.code, message: error.message, tab, permission: permissionForTab(tab) };
    }
  }, tabId);
  assert.equal(initial.code, 'PAGE_PERMISSION');
  assert.equal(initial.tab.url, `${baseUrl}/first`);
  assert.equal(initial.permission.originPattern, originPattern);
  await clickWithoutSwitchingTab(app, '#scan-page');
  await app.waitForFunction(() => !document.querySelector('#page-access-card').classList.contains('hidden'));
  assert.match(await app.locator('#page-access-message').textContent(), /127\.0\.0\.1/);
  assert.doesNotMatch(await app.locator('#notice').textContent(), /请切换到招聘网站|不是网站/);
  await app.evaluate(() => {
    window.permissionRequests = [];
    chrome.permissions.request = async (request) => {
      window.permissionRequests.push({ request, isActive: navigator.userActivation.isActive });
      return false;
    };
  });
  await clickWithoutSwitchingTab(app, '#grant-page-access');
  await app.waitForFunction(() => document.querySelector('#notice').textContent.includes('尚未允许访问'));
  assert.equal(await app.locator('#grant-page-access').isEnabled(), true);
  assert.equal(await app.locator('#page-access-card').isVisible(), true);
  await clickWithoutSwitchingTab(app, '#grant-page-access');
  await app.waitForFunction(() => window.permissionRequests.length === 2);
  const rejectedRequests = await app.evaluate(() => window.permissionRequests);
  assert.deepEqual(rejectedRequests.map((entry) => entry.request), [{ origins: [originPattern] }, { origins: [originPattern] }]);
  assert.ok(rejectedRequests.every((entry) => entry.isActive));
  assert.equal(await fixture.locator('#name').inputValue(), '');
  reports.push({ check: 'ungranted page is detected; denied optional-site request permits retry', status: 'passed', initial, rejectedRequests });
  await app.evaluate(() => {
    chrome.permissions.request = (request) => new Promise((resolve) => {
      window.pendingPermissionRequest = request;
      window.resolvePermissionRequest = resolve;
    });
  });
  await clickWithoutSwitchingTab(app, '#grant-page-access');
  await app.waitForFunction(() => typeof window.resolvePermissionRequest === 'function');
  assert.equal(await app.locator('#grant-page-access').isDisabled(), true);
  const changedDuringRequest = await context.newPage();
  await changedDuringRequest.goto(`${baseUrl}/changed-during-request`);
  await changedDuringRequest.bringToFront();
  await app.evaluate(() => window.resolvePermissionRequest(true));
  await app.waitForFunction(() => document.querySelector('#notice').textContent.includes('当前页面已变化'));
  assert.equal(await app.locator('#page-access-card').isVisible(), false);
  assert.equal(await app.locator('.field-card').count(), 0);
  assert.equal(await changedDuringRequest.locator('#name').inputValue(), '');
  reports.push({ check: 'switching tabs during permission confirmation cannot scan or fill the replacement tab', status: 'passed' });
  await closeContext();

  const seedManifest = { ...JSON.parse(originalManifest), host_permissions: [originPattern] };
  await writeFile(path.join(extensionDirectory, 'manifest.json'), JSON.stringify(seedManifest));
  const seed = await openExtension();
  const seedGranted = await seed.app.evaluate((originPattern) => chrome.permissions.contains({ origins: [originPattern] }), originPattern);
  assert.equal(seedGranted, true);
  await closeContext();
  await writeFile(path.join(extensionDirectory, 'manifest.json'), originalManifest);

  const granted = await openExtension();
  const actualPermissions = await granted.app.evaluate(() => chrome.permissions.getAll());
  assert.ok(actualPermissions.origins.some((pattern) => pattern.includes('127.0.0.1')));
  await setProfile(granted.app);
  const fixtureGranted = await context.newPage();
  await fixtureGranted.goto(`${baseUrl}/granted`);
  await fixtureGranted.bringToFront();
  const grantedTabId = await activeId(granted.app);
  await granted.app.evaluate(() => {
    const executeScript = chrome.scripting.executeScript;
    let denyNext = true;
    chrome.scripting.executeScript = (details) => {
      if (denyNext) {
        denyNext = false;
        return Promise.reject(new Error('Cannot access contents of url. Extension manifest must request permission to access this host.'));
      }
      return executeScript.call(chrome.scripting, details);
    };
    window.permissionRequests = [];
    chrome.permissions.request = async (request) => {
      window.permissionRequests.push({ request, isActive: navigator.userActivation.isActive });
      return true;
    };
  });
  await clickWithoutSwitchingTab(granted.app, '#scan-page');
  await granted.app.waitForFunction(() => !document.querySelector('#page-access-card').classList.contains('hidden'));
  await clickWithoutSwitchingTab(granted.app, '#grant-page-access');
  await granted.app.waitForFunction(() => document.querySelectorAll('.field-card').length === 2);
  assert.equal(await granted.app.locator('#page-access-card').isVisible(), false);
  const acceptedRequests = await granted.app.evaluate(() => window.permissionRequests);
  assert.deepEqual(acceptedRequests, [{ request: { origins: [originPattern] }, isActive: true }]);
  assert.equal(await fixtureGranted.locator('#name').inputValue(), '');
  await clickWithoutSwitchingTab(granted.app, '#fill-selected');
  await fixtureGranted.waitForFunction(() => document.querySelector('#name').value === '权限测试同学' && document.querySelector('#email').value === 'permission@example.com');
  assert.equal(await fixtureGranted.evaluate(() => window.submitCount), 0);
  reports.push({ check: 'accepted single-site request retries real injection and user-confirmed UI fill', status: 'passed', acceptedRequests });
  await fixtureGranted.goto(`${baseUrl}/module-check`);
  const scan = await granted.app.evaluate(async (tabId) => {
    const { scanTab } = await import('./lib/page-access.js');
    return scanTab(tabId);
  }, grantedTabId);
  assert.equal(scan.ok, true);
  const nameField = scan.fields.find((field) => field.label === '姓名');
  assert.ok(nameField);
  const filled = await granted.app.evaluate(async ({ target, id }) => {
    const { fillTab } = await import('./lib/page-access.js');
    return fillTab(target, [{ id, value: '权限测试同学', overwrite: false }]);
  }, { target: scan.target, id: nameField.id });
  assert.equal(filled.results[0].status, 'filled');
  assert.equal(await fixtureGranted.locator('#name').inputValue(), '权限测试同学');
  assert.equal(await fixtureGranted.evaluate(() => window.submitCount), 0);

  const otherTab = await context.newPage();
  await otherTab.goto(`${baseUrl}/other`);
  await otherTab.bringToFront();
  const switched = await granted.app.evaluate(async (target) => {
    const { fillTab } = await import('./lib/page-access.js');
    try { await fillTab(target, []); return 'unexpected-success'; } catch (error) { return error.code; }
  }, scan.target);
  assert.equal(switched, 'PAGE_CHANGED');
  assert.equal(await otherTab.locator('#name').inputValue(), '');
  await fixtureGranted.bringToFront();
  await fixtureGranted.goto(`${baseUrl}/navigation`);
  const navigated = await granted.app.evaluate(async (target) => {
    const { fillTab } = await import('./lib/page-access.js');
    try { await fillTab(target, []); return 'unexpected-success'; } catch (error) { return error.code; }
  }, scan.target);
  assert.equal(navigated, 'PAGE_CHANGED');
  assert.equal(await fixtureGranted.locator('#name').inputValue(), '');
  const reloadScan = await granted.app.evaluate(async (tabId) => {
    const { scanTab } = await import('./lib/page-access.js');
    return scanTab(tabId);
  }, grantedTabId);
  await fixtureGranted.reload();
  const reloaded = await granted.app.evaluate(async (target) => {
    const { fillTab } = await import('./lib/page-access.js');
    try { await fillTab(target, []); return 'unexpected-success'; } catch (error) { return error.code; }
  }, reloadScan.target);
  assert.equal(reloaded, 'PAGE_CHANGED');
  assert.equal(await fixtureGranted.locator('#name').inputValue(), '');
  reports.push({ check: 'real optional-site permission, content injection, fill, switched/navigated/reloaded page rejection', status: 'passed', actualPermissions, switched, navigated, reloaded, filled });
  console.log(JSON.stringify({ status: 'passed', limitations: ['The browser-native optional-permission confirmation dialog is not automated. Denial/retry/UI request shape use a request stub; actual host permission is seeded by installing a temporary test copy with the fixture origin then restoring its original optional-only manifest. Source files and user profiles are untouched.'], reports }, null, 2));
} finally {
  try {
    await closeContext();
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await cleanup();
  }
}
