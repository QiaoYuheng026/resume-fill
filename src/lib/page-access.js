const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:', 'file:']);

function pageError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function classifiedError(error) {
  if (error?.code) return error;
  const message = String(error?.message ?? error ?? '');
  if (/chrome:\/\/|edge:\/\/|about:|devtools:\/\/|(?:chrome|moz|safari-web)-extension:\/\/|extensions gallery|web store|chromewebstore\.google\.com|chrome\.google\.com\/webstore|microsoftedge\.microsoft\.com\/addons|cannot be scripted|cannot access a chrome|cannot access an edge/i.test(message)) {
    return pageError('UNSUPPORTED_PAGE', '此页面受浏览器保护，无法读取或填写。请打开公司的招聘表单后重新识别。', error);
  }
  if (/no tab with|tab (?:was )?closed|frame (?:was )?removed|no frame with|document.*(?:unloaded|removed)|receiving end does not exist|could not establish connection|message port closed/i.test(message)) {
    return pageError('PAGE_CHANGED', '目标页面已经关闭、刷新或切换，请重新识别当前页面。', error);
  }
  if (/cannot access|can't access|permission|access denied|not allowed|not permitted|must request|requires? (?:a )?host/i.test(message)) {
    return pageError('PAGE_PERMISSION', '尚未获得读取当前网站的权限。请授权此网站后重新识别；本地文件需在扩展详情中允许访问文件网址。', error);
  }
  return error instanceof Error ? error : new Error(message || '页面操作失败，请重新识别。');
}

function assertTabId(tabId) {
  if (!Number.isInteger(tabId) || tabId < 0) {
    throw pageError('PAGE_CHANGED', '没有找到当前网页，请切换到招聘表单后重新识别。');
  }
}

function readDocumentMetadata() {
  const tokenKey = '__resumeFillPageAccessToken_v1';
  if (!globalThis[tokenKey]) {
    const nonce = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    Object.defineProperty(globalThis, tokenKey, { value: `${performance.timeOrigin}:${nonce}`, configurable: false, enumerable: false, writable: false });
  }
  return {
    url: location.href,
    title: document.title,
    protocol: location.protocol,
    documentToken: globalThis[tokenKey]
  };
}

async function metadataFor(tabId, api) {
  const results = await api.scripting.executeScript({ target: { tabId }, func: readDocumentMetadata });
  const injection = results?.find(entry => entry.frameId === 0) ?? results?.[0];
  const metadata = injection?.result;
  if (!metadata || typeof metadata.url !== 'string' || typeof metadata.documentToken !== 'string' || !metadata.documentToken) {
    throw pageError('PAGE_CHANGED', '未能确认当前页面，请重新识别。');
  }
  const protocol = metadata.protocol || (() => { try { return new URL(metadata.url).protocol; } catch { return ''; } })();
  if (!SUPPORTED_PROTOCOLS.has(protocol)) {
    throw pageError('UNSUPPORTED_PAGE', '此页面受浏览器保护，无法读取或填写。请打开公司的招聘表单后重新识别。');
  }
  return {
    url: metadata.url,
    title: typeof metadata.title === 'string' ? metadata.title : '',
    documentToken: metadata.documentToken,
    ...(typeof injection.documentId === 'string' && injection.documentId ? { documentId: injection.documentId } : {})
  };
}

function assertSameDocument(expected, actual) {
  if (!expected || expected.url !== actual.url || expected.documentToken !== actual.documentToken
    || (expected.documentId && expected.documentId !== actual.documentId)) {
    throw pageError('PAGE_CHANGED', '目标页面已经变化，请重新识别当前页面，再确认要填入的内容。');
  }
}

function sendDocumentMessage(tabId, message, metadata, api) {
  return metadata.documentId
    ? api.tabs.sendMessage(tabId, message, { documentId: metadata.documentId })
    : api.tabs.sendMessage(tabId, message);
}

export async function queryActiveTab(api = globalThis.chrome) {
  const tabs = await api.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs?.find(tab => Number.isInteger(tab?.id) && tab.id >= 0) ?? null;
}

export function permissionForTab(tab) {
  if (typeof tab?.url !== 'string') return null;
  try {
    const url = new URL(tab.url);
    if (!['http:', 'https:'].includes(url.protocol) || !url.host) return null;
    if (url.hostname === 'chromewebstore.google.com'
      || (url.hostname === 'chrome.google.com' && /^\/webstore(?:\/|$)/.test(url.pathname))
      || (url.hostname === 'microsoftedge.microsoft.com' && /^\/addons(?:\/|$)/.test(url.pathname))) return null;
    return { originPattern: `${url.origin}/*`, displayHost: url.host };
  } catch {
    return null;
  }
}

export async function scanTab(tabId, api = globalThis.chrome) {
  assertTabId(tabId);
  try {
    await api.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    const before = await metadataFor(tabId, api);
    const scan = await sendDocumentMessage(tabId, { type: 'RF_SCAN' }, before, api);
    const after = await metadataFor(tabId, api);
    assertSameDocument(before, after);
    if (!scan?.ok) throw new Error(scan?.error || '页面识别失败，请刷新后重新识别。');
    return { ...scan, target: { tabId, ...after } };
  } catch (error) {
    throw classifiedError(error);
  }
}

export async function fillTab(target, entries, api = globalThis.chrome) {
  assertTabId(target?.tabId);
  try {
    const activeTab = await queryActiveTab(api);
    if (activeTab?.id !== target.tabId) {
      throw pageError('PAGE_CHANGED', '请切回刚才识别的招聘页面，或重新识别当前页面后再填写。');
    }
    const metadata = await metadataFor(target.tabId, api);
    assertSameDocument(target, metadata);
    const response = await sendDocumentMessage(target.tabId, { type: 'RF_FILL', entries }, metadata, api);
    if (!response?.ok) throw new Error(response?.error || '填写未完成，请重新识别页面。');
    const after = await metadataFor(target.tabId, api);
    assertSameDocument(target, after);
    return response;
  } catch (error) {
    throw classifiedError(error);
  }
}
