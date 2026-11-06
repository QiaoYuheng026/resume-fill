const RUN_INSTRUCTIONS = 'Run: node tests/content.browser.mjs. Optional: set BROWSER_PATH to Chrome/Edge/Chromium executable; set NODE_MODULES_PATH to a node_modules directory containing playwright. Local npm dependencies and the Codex bundled runtime are also detected.';

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const moduleCandidates = [
  process.env.NODE_MODULES_PATH && path.join(process.env.NODE_MODULES_PATH, 'playwright'),
  'playwright',
  path.join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
].filter(Boolean);
let playwright;
for (const candidate of moduleCandidates) {
  try {
    playwright = require(candidate);
    break;
  } catch {}
}
if (!playwright) throw new Error(`Playwright is not available. ${RUN_INSTRUCTIONS}`);

const browserCandidates = process.env.BROWSER_PATH ? [process.env.BROWSER_PATH] : [
  path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  playwright.chromium.executablePath()
];
const executablePath = browserCandidates.find((candidate) => existsSync(candidate));
if (!executablePath) throw new Error(`A browser executable was not found. ${RUN_INSTRUCTIONS}`);

const source = readFileSync(new URL('../src/content.js', import.meta.url), 'utf8');
const browser = await playwright.chromium.launch({ executablePath, headless: true });

async function withPage(markup, callback) {
  const page = await browser.newPage();
  try {
    await page.setContent(`<!doctype html><html><body>${markup}</body></html>`);
    await page.addScriptTag({ content: source });
    await callback(page);
  } finally {
    await page.close();
  }
}

async function scan(page) {
  return page.evaluate(() => window.__resumeFillBridge.scan());
}

async function fill(page, entries) {
  return page.evaluate((values) => window.__resumeFillBridge.fill(values), entries);
}

function findField(scanned, label) {
  const field = scanned.fields.find((candidate) => candidate.label === label);
  assert.ok(field, `Field was not found: ${label}`);
  return field;
}

try {
  await test('normal fields fill correctly without overwriting values or submitting', async () => {
    await withPage(`
      <form id="application">
      <h2>基本信息</h2><label>姓名 *<input id="name"></label>
      <label>邮箱<input id="email" type="email" value="original@example.com"></label>
      <label>学历<select id="degree" role="combobox"><option value="0">请选择学历</option><option value="master">硕士</option></select></label>
      <fieldset><legend>性别</legend><label><input type="radio" name="gender" value="male">男</label><label><input type="radio" name="gender" value="female">女</label></fieldset>
      <fieldset><legend>教育经历</legend><label>学校<input id="school"></label><label>入学时间<input id="start" type="month"></label></fieldset>
      <label>生日<input id="birth" type="date"></label>
      <label>同意隐私声明<input id="consent" type="checkbox"></label>
      <div role="combobox" aria-label="所在城市" tabindex="0">请选择所在城市</div>
      <input type="password"><input type="file"><input hidden><input disabled><input readonly>
      <button type="submit">提交</button></form>
    `, async (page) => {
      await page.evaluate(() => {
        window.submitCount = 0;
        window.inputCount = 0;
        document.querySelector('#application').addEventListener('submit', (event) => { event.preventDefault(); window.submitCount++; });
        document.querySelector('#name').addEventListener('input', () => window.inputCount++);
      });
      const scanned = await scan(page);
      assert.equal(scanned.fields.length, 9);
      assert.equal(findField(scanned, '学历').value, '');
      assert.equal(findField(scanned, '学校').section, '教育经历');
      assert.equal(findField(scanned, '性别').options.length, 2);
      const values = { 姓名: '测试同学', 邮箱: 'new@example.com', 学历: '硕士', 性别: '女', 学校: '示例大学', 入学时间: '2023年9月', 生日: '2001/6/9', 同意隐私声明: 'true', 所在城市: '上海' };
      const response = await fill(page, Object.entries(values).map(([label, value]) => ({ id: findField(scanned, label).id, value })));
      assert.equal(response.results.filter((entry) => entry.status === 'filled').length, 6);
      assert.equal(response.results.filter((entry) => entry.status === 'manual').length, 2);
      assert.equal(response.results.filter((entry) => entry.status === 'skipped').length, 1);
      assert.deepEqual(await page.evaluate(() => ({
        name: document.querySelector('#name').value,
        email: document.querySelector('#email').value,
        degree: document.querySelector('#degree').value,
        gender: document.querySelector('input[name="gender"]:checked').value,
        start: document.querySelector('#start').value,
        birth: document.querySelector('#birth').value,
        consent: document.querySelector('#consent').checked,
        submitCount: window.submitCount,
        inputCount: window.inputCount
      })), { name: '测试同学', email: 'original@example.com', degree: 'master', gender: 'female', start: '2023-09', birth: '2001-06-09', consent: false, submitCount: 0, inputCount: 1 });
    });
  });

  await test('duplicate native option labels and values require manual selection', async () => {
    await withPage(`
      <label>重复名称<select id="labels"><option value="">请选择</option><option value="one">硕士</option><option value="two">硕士</option></select></label>
      <label>重复值<select id="values"><option value="">请选择</option><option value="same">本科</option><option value="same">硕士</option></select></label>
    `, async (page) => {
      const scanned = await scan(page);
      const response = await fill(page, scanned.fields.map((field) => ({ id: field.id, value: '硕士' })));
      assert.ok(response.results.every((entry) => entry.status === 'manual'));
      assert.deepEqual(await page.locator('select').evaluateAll((elements) => elements.map((element) => element.value)), ['', '']);
    });
  });

  await test('button based custom comboboxes are visible for copying and never clicked', async () => {
    await withPage('<button type="button" role="combobox" aria-label="意向城市">请选择城市</button><button type="submit">普通提交</button>', async (page) => {
      await page.evaluate(() => {
        window.clickCount = 0;
        document.querySelector('[role="combobox"]').addEventListener('click', () => { window.clickCount++; });
      });
      const scanned = await scan(page);
      assert.equal(scanned.fields.length, 1);
      const field = findField(scanned, '意向城市');
      assert.equal(field.kind, 'custom-select');
      const response = await fill(page, [{ id: field.id, value: '上海' }]);
      assert.equal(response.results[0].status, 'manual');
      assert.equal(await page.evaluate(() => window.clickCount), 0);
    });
  });

  await test('radio groups reject duplicate values and keep different forms separate', async () => {
    await withPage(`
      <form><fieldset><legend>本人性别</legend><label><input type="radio" name="gender" value="same">男</label><label><input type="radio" name="gender" value="same">女</label></fieldset></form>
      <form><fieldset><legend>推荐人性别</legend><label><input type="radio" name="gender" value="male">男</label><label><input type="radio" name="gender" value="female">女</label></fieldset></form>
    `, async (page) => {
      const scanned = await scan(page);
      assert.equal(scanned.fields.length, 2);
      const response = await fill(page, scanned.fields.map((field) => ({ id: field.id, value: '女' })));
      assert.equal(response.results[0].status, 'manual');
      assert.equal(response.results[1].status, 'filled');
      assert.deepEqual(await page.locator('form').evaluateAll((forms) => forms.map((form) => form.querySelector('input:checked')?.value || '')), ['', 'female']);
    });
  });

  await test('third party sections are retained independently from basic information', async () => {
    await withPage(`
      <section><h2>基本信息</h2>
      <fieldset><legend>紧急联系人</legend><label>姓名<input></label><label>手机号<input></label></fieldset>
      <fieldset><legend>推荐人</legend><label>姓名<input></label></fieldset>
      <fieldset><legend>家庭成员</legend><label>姓名<input></label></fieldset>
      </section>
    `, async (page) => {
      const scanned = await scan(page);
      assert.deepEqual(scanned.fields.map((field) => field.section), ['紧急联系人', '紧急联系人', '推荐人', '家庭成员']);
    });
  });

  await test('mutated values, labels and sections are rejected after scanning', async () => {
    await withPage(`
      <section><h2>基本信息</h2><label id="label">姓名<input id="name"></label><label>邮箱<input id="email"></label></section>
      <fieldset><legend id="legend">教育经历</legend><label>学校<input id="school"></label></fieldset>
    `, async (page) => {
      const scanned = await scan(page);
      await page.evaluate(() => {
        document.querySelector('#label').firstChild.textContent = '推荐人姓名';
        document.querySelector('#email').value = 'changed@example.com';
        document.querySelector('#legend').textContent = '工作经历';
      });
      const response = await fill(page, scanned.fields.map((field) => ({ id: field.id, value: '替换值', overwrite: true })));
      assert.ok(response.results.every((entry) => entry.status === 'skipped'));
      assert.equal(await page.locator('#email').inputValue(), 'changed@example.com');
    });
  });

  await test('changed or duplicated select options and radio groups are rejected', async () => {
    await withPage(`
      <label>学历<select id="degree"><option value="">请选择</option><option value="master">硕士</option></select></label>
      <label>学位<select id="degree2"><option value="">请选择</option><option value="master">硕士</option></select></label>
      <fieldset><legend>性别</legend><label><input type="radio" name="gender" value="male">男</label><label id="femaleLabel"><input type="radio" name="gender" value="female">女</label></fieldset>
    `, async (page) => {
      const scanned = await scan(page);
      await page.evaluate(() => {
        document.querySelector('#degree option[value="master"]').textContent = '博士';
        document.querySelector('#degree2').add(new Option('另一个选项', 'master'));
        document.querySelector('#femaleLabel').lastChild.textContent = '未知';
      });
      const response = await fill(page, [
        { id: findField(scanned, '学历').id, value: '硕士' },
        { id: findField(scanned, '学位').id, value: '硕士' },
        { id: findField(scanned, '性别').id, value: '女' }
      ]);
      assert.deepEqual(response.results.map((entry) => entry.status), ['skipped', 'manual', 'skipped']);
      assert.equal(await page.locator('input:checked').count(), 0);
    });
  });

  await test('re-rendered controls and framework value resets never report success', async () => {
    await withPage('<label>姓名<input id="name"></label><label>邮箱<input id="email"></label><label>学校<input id="school"></label>', async (page) => {
      const scanned = await scan(page);
      await page.evaluate(() => {
        document.querySelector('#name').addEventListener('input', (event) => { event.target.replaceWith(event.target.cloneNode()); });
        document.querySelector('#email').addEventListener('input', (event) => { event.target.value = ''; });
        document.querySelector('#school').remove();
      });
      const response = await fill(page, scanned.fields.map((field) => ({ id: field.id, value: '测试值' })));
      assert.deepEqual(response.results.map((entry) => entry.status), ['manual', 'manual', 'skipped']);
    });
  });

  await test('same origin frames and open shadow roots work; opaque frames warn', async () => {
    await withPage('<div id="shadow"></div><iframe id="frame" srcdoc="<label>电话<input id=phone type=tel></label>"></iframe><iframe sandbox srcdoc="<label>隐藏页面<input></label>"></iframe>', async (page) => {
      await page.evaluate(() => { document.querySelector('#shadow').attachShadow({ mode: 'open' }).innerHTML = '<label>专业<input id="major"></label>'; });
      await page.waitForFunction(() => document.querySelector('#frame').contentDocument?.querySelector('#phone'));
      const scanned = await scan(page);
      assert.equal(scanned.fields.length, 2);
      assert.ok(scanned.warnings.some((warning) => warning.includes('跨域')));
      const response = await fill(page, [{ id: findField(scanned, '专业').id, value: '计算机' }, { id: findField(scanned, '电话').id, value: '13800138000' }]);
      assert.ok(response.results.every((entry) => entry.status === 'filled'));
      await page.locator('#frame').evaluate((frame) => { frame.style.display = 'none'; });
      const hidden = await fill(page, [{ id: findField(scanned, '电话').id, value: '13900139000', overwrite: true }]);
      assert.equal(hidden.results[0].status, 'skipped');
    });
  });

  await test('iframe navigation invalidates old scanned fields', async () => {
    await withPage('<iframe id="frame" srcdoc="<label>电话<input id=phone type=tel></label>"></iframe>', async (page) => {
      await page.waitForFunction(() => document.querySelector('#frame').contentDocument?.querySelector('#phone'));
      const scanned = await scan(page);
      await page.locator('#frame').evaluate((frame) => { frame.srcdoc = '<label>新字段<input id="replacement"></label>'; });
      await page.waitForFunction(() => document.querySelector('#frame').contentDocument?.querySelector('#replacement'));
      const response = await fill(page, [{ id: findField(scanned, '电话').id, value: '13800138000' }]);
      assert.equal(response.results[0].status, 'skipped');
      assert.equal(await page.frameLocator('#frame').locator('#replacement').inputValue(), '');
    });
  });

  await test('date precision, live maximum length and browser constraints are respected', async () => {
    await withPage('<label>生日<input type="date" id="birth"></label><label>描述<textarea id="description"></textarea></label><label>代码<input id="code" pattern="[0-9]{4}"></label>', async (page) => {
      const scanned = await scan(page);
      await page.locator('#description').evaluate((element) => { element.maxLength = 5; });
      const response = await fill(page, [{ id: findField(scanned, '生日').id, value: '2001年6月' }, { id: findField(scanned, '描述').id, value: '超过五个字的描述' }, { id: findField(scanned, '代码').id, value: 'abc' }]);
      assert.ok(response.results.every((entry) => entry.status === 'manual'));
      assert.equal(await page.locator('#birth').inputValue(), '');
      assert.equal(await page.locator('#description').inputValue(), '');
    });
  });

  await test('textarea line endings normalize and repeated injection preserves identifiers', async () => {
    await withPage('<label>介绍<textarea id="intro"></textarea></label>', async (page) => {
      const scanned = await scan(page);
      const identifier = findField(scanned, '介绍').id;
      const response = await fill(page, [{ id: identifier, value: '第一行\r\n第二行' }]);
      assert.equal(response.results[0].status, 'filled');
      assert.equal(await page.locator('#intro').inputValue(), '第一行\n第二行');
      await page.addScriptTag({ content: source });
      assert.equal(findField(await scan(page), '介绍').id, identifier);
    });
  });

  await test('unnamed radios remain separate and hidden checked peers protect existing answers', async () => {
    await withPage('<label><input type="radio">选项甲</label><label><input type="radio">选项乙</label><fieldset><legend>选项组</legend><input type="radio" name="choice" value="hidden" checked hidden><label><input type="radio" name="choice" value="visible">可见选项</label></fieldset>', async (page) => {
      const scanned = await scan(page);
      assert.equal(scanned.fields.length, 3);
      const group = findField(scanned, '选项组');
      assert.equal(group.value, 'hidden');
      const response = await fill(page, [{ id: group.id, value: '可见选项' }]);
      assert.equal(response.results[0].status, 'skipped');
      assert.equal(await page.locator('input[name="choice"]:checked').inputValue(), 'hidden');
    });
  });
} finally {
  await browser.close();
}
