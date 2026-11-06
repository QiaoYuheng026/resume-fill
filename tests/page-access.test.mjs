import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { queryActiveTab, permissionForTab, scanTab, fillTab } from '../src/lib/page-access.js';

function mockApi({ tabs = [{ id: 41 }], metadata, injectionError, scan, fill, documentIds } = {}) {
  const calls = [];
  const snapshots = metadata ?? [{ url: 'https://jobs.example.com/apply', title: '职位申请', protocol: 'https:', documentToken: 'document-1' }];
  let metadataIndex = 0;
  const api = {
    tabs: {
      query: async query => { calls.push({ method: 'query', query }); return tabs; },
      sendMessage: async (tabId, message, options) => {
        calls.push({ method: 'sendMessage', tabId, message, ...(options ? { options } : {}) });
        if (message.type === 'RF_SCAN') return scan ?? { ok: true, fields: [{ id: 'rf-1', label: '姓名' }], warnings: [] };
        return fill ?? { ok: true, results: [{ id: 'rf-1', status: 'filled' }] };
      }
    },
    scripting: {
      executeScript: async options => {
        calls.push({ method: 'executeScript', options });
        if (injectionError) throw injectionError;
        if (options.files) return [{ frameId: 0 }];
        const index = metadataIndex++;
        const result = snapshots[Math.min(index, snapshots.length - 1)];
        const documentId = documentIds?.[Math.min(index, documentIds.length - 1)];
        return [{ frameId: 0, result, ...(documentId ? { documentId } : {}) }];
      }
    }
  };
  return { api, calls };
}

const initialMetadata = { url: 'https://jobs.example.com/apply', title: '职位申请', protocol: 'https:', documentToken: 'document-1' };
const target = { tabId: 41, url: initialMetadata.url, title: initialMetadata.title, documentToken: initialMetadata.documentToken };

test('从最后聚焦窗口读取激活标签，不依赖 URL 权限', async () => {
  const { api, calls } = mockApi();
  assert.deepEqual(await queryActiveTab(api), { id: 41 });
  assert.deepEqual(calls[0].query, { active: true, lastFocusedWindow: true });
  assert.equal(await queryActiveTab(mockApi({ tabs: [] }).api), null);
});

test('站点授权仅支持合法 HTTP(S)，保留 origin 与端口且不含路径或凭据', () => {
  assert.deepEqual(permissionForTab({ url: 'https://user:secret@jobs.example.com:8443/apply?key=abc' }), { originPattern: 'https://jobs.example.com:8443/*', displayHost: 'jobs.example.com:8443' });
  assert.deepEqual(permissionForTab({ url: 'http://localhost:3000/apply' }), { originPattern: 'http://localhost:3000/*', displayHost: 'localhost:3000' });
  for (const url of [undefined, '', 'not a url', 'file:///C:/resume.html', 'chrome://extensions/', 'edge://settings', 'about:blank', 'chrome-extension://abc/index.html', 'javascript:alert(1)', 'https://chromewebstore.google.com/detail/example', 'https://chrome.google.com/webstore/detail/example', 'https://microsoftedge.microsoft.com/addons/detail/example']) {
    assert.equal(permissionForTab({ url }), null);
  }
});

test('tabs.url 未暴露时仍尝试注入并正常扫描，保存文档元数据', async () => {
  const { api, calls } = mockApi();
  const active = await queryActiveTab(api);
  assert.equal(active.url, undefined);
  const result = await scanTab(active.id, api);
  assert.deepEqual(result.target, target);
  assert.equal(result.fields[0].label, '姓名');
  assert.deepEqual(calls.filter(call => call.method === 'executeScript').map(call => Boolean(call.options.files)), [true, false, false]);
});

test('注入权限错误映射为 PAGE_PERMISSION，受保护协议映射 UNSUPPORTED_PAGE', async () => {
  await assert.rejects(scanTab(41, mockApi({ injectionError: new Error('Cannot access contents of url "https://jobs.example.com/". Extension manifest must request permission to access this host.') }).api), error => error.code === 'PAGE_PERMISSION');
  await assert.rejects(scanTab(41, mockApi({ injectionError: new Error('Cannot access a chrome:// URL') }).api), error => error.code === 'UNSUPPORTED_PAGE');
  await assert.rejects(scanTab(41, mockApi({ injectionError: new Error('The extensions gallery cannot be scripted.') }).api), error => error.code === 'UNSUPPORTED_PAGE');
  await assert.rejects(scanTab(41, mockApi({ injectionError: new Error('Cannot access contents of url "https://chromewebstore.google.com/detail/example".') }).api), error => error.code === 'UNSUPPORTED_PAGE');
  for (const protocol of ['chrome:', 'edge:', 'about:', 'chrome-extension:']) {
    const { api, calls } = mockApi({ metadata: [{ ...initialMetadata, url: `${protocol}//protected`, protocol }] });
    await assert.rejects(scanTab(41, api), error => error.code === 'UNSUPPORTED_PAGE');
    assert.equal(calls.some(call => call.method === 'sendMessage'), false);
  }
});

test('扫描中 URL 变化或相同 URL 刷新均作废结果', async () => {
  for (const after of [{ ...initialMetadata, url: `${initialMetadata.url}/next` }, { ...initialMetadata, documentToken: 'document-2' }]) {
    await assert.rejects(scanTab(41, mockApi({ metadata: [initialMetadata, after] }).api), error => error.code === 'PAGE_CHANGED');
  }
});

test('有浏览器 documentId 时扫描和填写指令绑定精确文档，避免发送期间导航串页', async () => {
  const { api, calls } = mockApi({ documentIds: ['chrome-document-1'] });
  const scan = await scanTab(41, api);
  assert.equal(scan.target.documentId, 'chrome-document-1');
  await fillTab(scan.target, [{ id: 'rf-1', value: '张三' }], api);
  assert.deepEqual(calls.filter(call => call.method === 'sendMessage').map(call => call.options), [
    { documentId: 'chrome-document-1' }, { documentId: 'chrome-document-1' }
  ]);
  await assert.rejects(scanTab(41, mockApi({ documentIds: ['chrome-document-1', 'chrome-document-2'] }).api), error => error.code === 'PAGE_CHANGED');
  const changed = mockApi({ documentIds: ['chrome-document-2'] });
  await assert.rejects(fillTab(scan.target, [], changed.api), error => error.code === 'PAGE_CHANGED');
  assert.equal(changed.calls.some(call => call.method === 'sendMessage'), false);
});

test('填入前必须仍在原激活标签，即使两页 URL 相同也不得串页', async () => {
  const { api, calls } = mockApi({ tabs: [{ id: 42, url: target.url }] });
  await assert.rejects(fillTab(target, [{ id: 'rf-1', value: '张三' }], api), error => error.code === 'PAGE_CHANGED');
  assert.equal(calls.some(call => call.method === 'sendMessage' || call.method === 'executeScript'), false);
});

test('填入前校验 URL 与文档 token，变化时不发送填写指令', async () => {
  for (const metadata of [{ ...initialMetadata, url: `${target.url}/next` }, { ...initialMetadata, documentToken: 'document-2' }]) {
    const { api, calls } = mockApi({ metadata: [metadata] });
    await assert.rejects(fillTab(target, [{ id: 'rf-1', value: '张三' }], api), error => error.code === 'PAGE_CHANGED');
    assert.equal(calls.some(call => call.method === 'sendMessage'), false);
  }
});

test('URL 不可见但文档未变时可填写，并透传覆盖选择', async () => {
  const { api, calls } = mockApi();
  const entries = [{ id: 'rf-1', value: '张三', overwrite: false }];
  const result = await fillTab(target, entries, api);
  assert.equal(result.results[0].status, 'filled');
  assert.deepEqual(calls.find(call => call.method === 'sendMessage'), { method: 'sendMessage', tabId: 41, message: { type: 'RF_FILL', entries } });
});

test('本地文件可注入但不生成站点授权请求，接收端失效提示重新识别', async () => {
  const metadata = { ...initialMetadata, url: 'file:///C:/practice.html', protocol: 'file:' };
  assert.equal((await scanTab(41, mockApi({ metadata: [metadata] }).api)).target.url, metadata.url);
  await assert.rejects(scanTab(41, mockApi({ injectionError: new Error('Could not establish connection. Receiving end does not exist.') }).api), error => error.code === 'PAGE_CHANGED');
});

test('执行函数独立可序列化，同文档 token 稳定，不同文档重建 token', async () => {
  const { api, calls } = mockApi();
  await scanTab(41, api);
  const reader = calls.find(call => call.options?.func)?.options.func;
  const makeContext = nonce => vm.createContext({
    crypto: { randomUUID: () => nonce }, performance: { timeOrigin: 100 },
    location: { href: 'https://jobs.example.com/apply', protocol: 'https:' }, document: { title: '申请' }
  });
  const context = makeContext('one');
  const first = vm.runInContext(`(${reader.toString()})()`, context);
  const second = vm.runInContext(`(${reader.toString()})()`, context);
  assert.equal(first.documentToken, second.documentToken);
  const refreshed = vm.runInContext(`(${reader.toString()})()`, makeContext('two'));
  assert.notEqual(first.documentToken, refreshed.documentToken);
});
