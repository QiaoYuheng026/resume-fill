const RUN_INSTRUCTIONS = 'Run: node tests/sidepanel.browser.mjs. Optional: BROWSER_PATH points to Edge/Chromium; NODE_MODULES_PATH points to node_modules containing playwright. Uses an isolated headed browser, fictional data, actual SIDE_PANEL context and a temporary extension copy for a host-permission seed. The native permission prompt is not automated.';

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
for (const candidate of [process.env.NODE_MODULES_PATH && path.join(process.env.NODE_MODULES_PATH, 'playwright'), 'playwright', path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)) {
  try { playwright = require(candidate); break; } catch {}
}
if (!playwright) throw new Error(`Playwright was not found. ${RUN_INSTRUCTIONS}`);
const browserPath = [process.env.BROWSER_PATH, path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'), playwright.chromium.executablePath()].filter(Boolean).find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error(`Edge/Chromium was not found. ${RUN_INSTRUCTIONS}`);

const testDirectory = await realpath(path.dirname(fileURLToPath(import.meta.url)));
const extensionSourceDirectory = await realpath(path.join(testDirectory, '..', 'src'));
const temporaryDirectory = await mkdtemp(path.join(testDirectory, '.sidepanel-test-'));
const extensionDirectory = path.join(temporaryDirectory, 'extension');
const profileDirectory = path.join(temporaryDirectory, 'browser-profile');
const mockOrigin = 'http://resume-fill-sidepanel.test';
const mockForm = `<!doctype html><html lang="zh-CN"><head><title>虚构校招练习表单</title></head><body><h1>基本信息</h1><form><label>姓名<input id="name" autocomplete="name"></label><label>手机号码<input id="phone" type="tel"></label><button>提交</button></form><script>window.submitCount=0;document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();window.submitCount++});</script></body></html>`;
let context;
let browserSession;
let panelSession;
const report = { browserPath, actualSidePanel: false, steps: [] };

function createTargetSession(browserProtocol, sessionId) {
  let sequence = 1;
  const pending = new Map();
  const receive = ({ sessionId: receivedSession, message }) => {
    if (receivedSession !== sessionId) return;
    const parsed = JSON.parse(message);
    if (!parsed.id || !pending.has(parsed.id)) return;
    const request = pending.get(parsed.id);
    pending.delete(parsed.id);
    clearTimeout(request.timer);
    if (parsed.error) request.reject(new Error(parsed.error.message));
    else request.resolve(parsed.result);
  };
  browserProtocol.on('Target.receivedMessageFromTarget', receive);
  return {
    async send(method, params = {}) {
      const id = sequence++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Side panel CDP timeout: ${method}`)); }, 15000);
        pending.set(id, { resolve, reject, timer });
        browserProtocol.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) }).catch((error) => { pending.delete(id); clearTimeout(timer); reject(error); });
      });
    },
    async evaluate(expression) {
      const response = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
      return response.result.value;
    },
    async dispose() {
      browserProtocol.off('Target.receivedMessageFromTarget', receive);
      for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Side panel session closed')); }
      pending.clear();
      await browserProtocol.send('Target.detachFromTarget', { sessionId }).catch(() => {});
    }
  };
}

async function waitPanel(expression, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await panelSession.evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Side panel condition timed out: ${expression}`);
}

async function clickPanel(identifier) {
  await panelSession.evaluate(`(() => { const element = document.getElementById(${JSON.stringify(identifier)}); if (!element || element.disabled || element.offsetParent === null) throw new Error('Panel control unavailable: ${identifier}'); element.click(); })()`);
}

async function launchExtension() {
  context = await playwright.chromium.launchPersistentContext(profileDirectory, {
    executablePath: browserPath,
    headless: false,
    viewport: { width: 1360, height: 900 },
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extensionDirectory}`, `--load-extension=${extensionDirectory}`, '--no-first-run']
  });
  await context.route(`${mockOrigin}/**`, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: mockForm }));
  return context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 10000 });
}

try {
  await cp(extensionSourceDirectory, extensionDirectory, { recursive: true });
  const manifestPath = path.join(extensionDirectory, 'manifest.json');
  const originalManifest = await readFile(manifestPath, 'utf8');
  await writeFile(manifestPath, JSON.stringify({ ...JSON.parse(originalManifest), host_permissions: [`${mockOrigin}/*`] }, null, 2));
  let worker = await launchExtension();
  assert.equal(await worker.evaluate((origin) => chrome.permissions.contains({ origins: [`${origin}/*`] }), mockOrigin), true);
  await context.close();
  context = null;
  await writeFile(manifestPath, originalManifest);
  worker = await launchExtension();
  assert.equal(await worker.evaluate((origin) => chrome.permissions.contains({ origins: [`${origin}/*`] }), mockOrigin), true);
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  assert.equal(Boolean(manifest.host_permissions?.length), false);
  report.steps.push('Seeded one mock origin using a temporary extension copy, restored its original optional-only manifest and verified the origin remains granted. Source extension files are unchanged.');

  const extensionId = worker.url().split('/')[2];
  await worker.evaluate(() => chrome.storage.local.set({ resumeFillProfile: { version: 1, basic: { name: '测试同学', phone: '13800000000', email: 'test@example.com' }, education: [], experience: [], projects: [], custom: [], rawText: '' } }));
  const launcher = await context.newPage();
  await launcher.goto(`chrome-extension://${extensionId}/index.html`);
  await launcher.evaluate(async () => {
    const { windowId } = await chrome.tabs.getCurrent();
    const button = document.createElement('button');
    button.id = 'test-open-actual-sidepanel';
    button.textContent = 'Open actual side panel';
    button.addEventListener('click', () => chrome.sidePanel.open({ windowId }).then(() => { window.openPanelResult = 'ok'; }, (error) => { window.openPanelResult = error.message; }));
    document.body.prepend(button);
  });
  await launcher.locator('#test-open-actual-sidepanel').click();
  await launcher.waitForFunction(() => window.openPanelResult);
  assert.equal(await launcher.evaluate(() => window.openPanelResult), 'ok');
  const contexts = await worker.evaluate(() => chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] }));
  assert.ok(contexts.some((entry) => entry.contextType === 'SIDE_PANEL' && entry.frameId === 0));
  report.actualSidePanel = true;
  report.sidePanelContext = contexts.find((entry) => entry.frameId === 0);
  browserSession = await context.browser().newBrowserCDPSession();
  const launcherProtocol = await context.newCDPSession(launcher);
  const launcherTarget = (await launcherProtocol.send('Target.getTargetInfo')).targetInfo.targetId;
  await launcherProtocol.detach();
  const { targetInfos } = await browserSession.send('Target.getTargets');
  const panelTarget = targetInfos.find((target) => target.type === 'page' && target.url === `chrome-extension://${extensionId}/index.html` && target.targetId !== launcherTarget);
  assert.ok(panelTarget, 'Actual side panel target was not found');
  const { sessionId } = await browserSession.send('Target.attachToTarget', { targetId: panelTarget.targetId, flatten: false });
  panelSession = createTargetSession(browserSession, sessionId);
  await panelSession.send('Runtime.enable');
  await waitPanel(`document.getElementById('profile-basic-name')?.value === '测试同学'`);
  await clickPanel('fill-tab');
  report.steps.push('Attached through CDP to the actual SIDE_PANEL context; ordinary extension tab only launches the panel.');

  const targetPage = await context.newPage();
  await targetPage.goto(`${mockOrigin}/account/resume`);
  await targetPage.bringToFront();
  await clickPanel('scan-page');
  await waitPanel(`document.getElementById('field-count').textContent === '2'`);
  await clickPanel('fill-selected');
  await targetPage.waitForFunction(() => document.querySelector('#name').value === '测试同学');
  assert.equal(await targetPage.locator('#phone').inputValue(), '13800000000');
  assert.equal(await targetPage.evaluate(() => window.submitCount), 0);
  report.steps.push('Actual side panel scans and fills two mock fields after the site permission is granted; submit count remains zero.');

  await targetPage.reload();
  assert.equal(await worker.evaluate((origin) => chrome.permissions.remove({ origins: [`${origin}/*`] }), mockOrigin), true);
  assert.equal(await worker.evaluate((origin) => chrome.permissions.contains({ origins: [`${origin}/*`] }), mockOrigin), false);
  await targetPage.bringToFront();
  await clickPanel('scan-page');
  await waitPanel(`!document.getElementById('page-access-card').classList.contains('hidden')`);
  const permissionState = await panelSession.evaluate(`({ message:document.getElementById('page-access-message').textContent, button:document.getElementById('grant-page-access').textContent, notice:document.getElementById('notice').textContent, count:document.getElementById('field-count').textContent })`);
  assert.match(permissionState.message, /resume-fill-sidepanel\.test/);
  assert.match(permissionState.button, /resume-fill-sidepanel\.test/);
  assert.doesNotMatch(permissionState.notice, /请切换到招聘网站/);
  assert.equal(permissionState.count, '0');
  assert.equal(await targetPage.locator('#name').inputValue(), '');
  report.steps.push({ revokedPermissionShowsSiteCard: permissionState });
  report.status = 'passed';
  report.limitations = 'Native host-permission approval prompt is not automated. Permission is seeded only for the isolated mock origin in the temporary extension copy; actual panel code and Chrome host enforcement are exercised.';
} catch (error) {
  report.status = 'failed';
  report.error = error.stack;
  if (panelSession) report.panelState = await panelSession.evaluate(`({notice:document.getElementById('notice')?.textContent,access:document.getElementById('page-access-message')?.textContent,fields:document.getElementById('field-count')?.textContent})`).catch(() => null);
} finally {
  if (panelSession) await panelSession.dispose();
  if (browserSession) await browserSession.detach().catch(() => {});
  if (context) await context.close();
  const resolved = await realpath(temporaryDirectory);
  if (path.dirname(resolved) !== testDirectory || !path.basename(resolved).startsWith('.sidepanel-test-')) throw new Error('Refused to remove an unexpected temporary browser profile path.');
  await rm(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
}
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'passed') process.exitCode = 1;
