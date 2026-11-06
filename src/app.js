import { PROFILE_FIELDS, emptyProfile, normalizeProfile, parseResumeText, buildCandidates, suggestForField } from './lib/profile.js';
import { importResumeFile } from './lib/importer.js';
import { queryActiveTab, permissionForTab, scanTab, fillTab } from './lib/page-access.js';

const extensionMode = Boolean(globalThis.chrome?.runtime?.id);
const demoMode = new URLSearchParams(location.search).has('demo');
const storageKey = 'resumeFillProfile';
const groupNames = { basic: '基本信息', education: '教育经历', experience: '实习 / 工作经历', projects: '项目经历', custom: '自定义资料' };
const groupFields = {
  education: [['school', '学校'], ['major', '专业'], ['educationLevel', '学历'], ['degree', '学位'], ['startDate', '开始时间'], ['endDate', '结束时间'], ['gpa', 'GPA / 成绩原文'], ['description', '教育经历补充']],
  experience: [['company', '公司'], ['role', '职位'], ['startDate', '开始时间'], ['endDate', '结束时间'], ['description', '工作 / 实习内容']],
  projects: [['name', '项目名称'], ['company', '所属公司 / 单位'], ['role', '担任角色'], ['startDate', '开始时间'], ['endDate', '结束时间'], ['description', '项目介绍与成果']],
  custom: [['label', '资料名称'], ['value', '资料内容']]
};
const sampleProfile = {
  version: 1,
  basic: { name: '林同学', phone: '13800000000', email: 'lin@example.com', gender: '女', birthDate: '2004-05-12', city: '杭州', hometown: '苏州', highestEducation: '本科', degree: '工学学士', jobIntent: '前端开发工程师', website: 'https://example.com', summary: '以下为虚构练习资料。熟悉 JavaScript 与网页交互开发，有校园项目和实习经验。' },
  education: [{ school: '示例大学', major: '软件工程', educationLevel: '本科', degree: '工学学士', startDate: '2023-09', endDate: '2027-06', gpa: '3.7 / 4.0', description: '主修数据结构、数据库与软件工程。' }, { school: '示例中学', major: '', educationLevel: '高中', degree: '', startDate: '2020-09', endDate: '2023-06', gpa: '', description: '' }],
  experience: [{ company: '示例科技有限公司', role: '前端开发实习生', startDate: '2026-06', endDate: '2026-09', description: '参与内部管理页面开发，完善表单校验与交互体验。此为虚构示例。' }],
  projects: [{ name: '校园活动报名平台', role: '前端开发', startDate: '2025-10', endDate: '2026-01', description: '实现活动列表、报名表单及个人报名记录页面。此为虚构示例。' }],
  custom: [{ label: '期望工作城市', value: '杭州' }],
  rawText: ''
};
const state = { profile: emptyProfile(), dirty: false, saved: false, candidates: [], matches: [], target: null, permissionTab: null, busy: false };
const elements = Object.fromEntries([...document.querySelectorAll('[id]')].map(element => [element.id, element]));

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function notice(message, isError = false) {
  elements.notice.textContent = message;
  elements.notice.classList.remove('hidden');
  elements.notice.classList.toggle('error', isError);
}

async function readStorage() {
  if (extensionMode) return (await chrome.storage.local.get(storageKey))[storageKey];
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : null;
}

async function writeStorage(profile) {
  if (extensionMode) await chrome.storage.local.set({ [storageKey]: profile });
  else localStorage.setItem(storageKey, JSON.stringify(profile));
}

async function copyText(text) {
  if (!String(text).trim()) throw new Error('这项内容为空，请先补充或选择资料。');
  try {
    await navigator.clipboard.writeText(String(text));
  } catch {
    const temporary = document.createElement('textarea');
    temporary.value = String(text);
    temporary.style.position = 'fixed';
    temporary.style.opacity = '0';
    document.body.append(temporary);
    temporary.select();
    const copied = document.execCommand('copy');
    temporary.remove();
    if (!copied) throw new Error('浏览器未允许复制，请直接选中预填内容后按 Ctrl+C。');
  }
}

function runAction(callback) {
  return async (...argumentsList) => {
    try { await callback(...argumentsList); }
    catch (error) { notice(error.message || '操作未完成，请重试。', true); }
  };
}

function showView(viewName) {
  for (const view of ['profile', 'fill']) {
    const active = viewName === view;
    elements[`${view}-view`].classList.toggle('hidden', !active);
    elements[`${view}-tab`].classList.toggle('active', active);
    elements[`${view}-tab`].setAttribute('aria-pressed', String(active));
  }
}

function updateSavedState() {
  elements['saved-dot'].classList.toggle('saved', state.saved && !state.dirty);
  elements['profile-state'].textContent = state.dirty ? '有更改 · 请确认保存' : state.saved ? '已保存在本机' : '尚未保存';
}

function resetPreview() {
  state.matches = [];
  state.target = null;
  state.permissionTab = null;
  elements['page-access-card'].classList.add('hidden');
  elements['page-title'].textContent = demoMode ? '练习表单已准备' : '打开一个网申表单';
  elements['page-subtitle'].textContent = '每到新的一页，重新识别一次。';
  elements['scan-warnings'].classList.add('hidden');
  renderMatches();
}

function markDirty() {
  if (!state.dirty) resetPreview();
  state.dirty = true;
  updateSavedState();
}

function setProfileValue(path, value) {
  const parts = path.split('.');
  if (parts[0] === 'basic') state.profile.basic[parts[1]] = value;
  else state.profile[parts[0]][Number(parts[1])][parts[2]] = value;
  markDirty();
}

function editorField(path, label, value) {
  const fieldName = path.split('.').at(-1);
  const multiline = ['description', 'summary', 'value'].includes(fieldName);
  const container = makeElement('div', `editor-field${multiline ? ' wide' : ''}`);
  const labelElement = makeElement('label', 'field-label', label);
  const inputId = `profile-${path.replaceAll('.', '-')}`;
  labelElement.htmlFor = inputId;
  const wrapper = makeElement('div', 'field-input-wrap');
  const input = makeElement(multiline ? 'textarea' : 'input');
  input.id = inputId;
  input.value = value || '';
  input.dataset.profilePath = path;
  input.maxLength = fieldName === 'summary' ? 12000 : multiline ? 20000 : fieldName === 'label' ? 100 : 1000;
  if (multiline) input.rows = 3;
  if (/Date$/.test(fieldName)) input.placeholder = fieldName === 'birthDate' ? 'YYYY-MM-DD' : 'YYYY-MM / 至今';
  input.addEventListener('input', () => setProfileValue(path, input.value));
  wrapper.append(input);
  if (fieldName !== 'label') {
    const copy = makeElement('button', 'field-copy', '复制');
    copy.type = 'button';
    copy.title = `复制${label}`;
    copy.addEventListener('click', runAction(async () => { await copyText(input.value); notice(`已复制「${label}」。`); }));
    wrapper.append(copy);
  }
  container.append(labelElement, wrapper);
  return container;
}

function renderEditor() {
  const fragment = document.createDocumentFragment();
  Object.entries(groupNames).forEach(([group, groupLabel], groupIndex) => {
    const section = makeElement('details', 'profile-section');
    section.dataset.group = group;
    section.open = group === 'basic';
    const summary = makeElement('summary');
    summary.append(makeElement('span', 'section-number', String(groupIndex + 1).padStart(2, '0')), document.createTextNode(groupLabel));
    if (group !== 'basic') summary.append(makeElement('span', 'section-length', String(state.profile[group].length)));
    const body = makeElement('div', 'section-fields');
    if (group === 'basic') {
      const grid = makeElement('div', 'fields-grid');
      PROFILE_FIELDS.filter(field => field.group === 'basic').forEach(field => {
        const key = field.key.split('.').at(-1);
        grid.append(editorField(`basic.${key}`, field.label, state.profile.basic[key]));
      });
      body.append(grid);
    } else {
      const entries = state.profile[group];
      if (!entries.length) body.append(makeElement('p', 'empty-hint', '还没有资料，可按需添加。'));
      entries.forEach((entry, entryIndex) => {
        const card = makeElement('div', 'entry-card');
        const heading = makeElement('div', 'entry-title', `${groupLabel} ${entryIndex + 1}`);
        const removeButton = makeElement('button', 'text-button danger', '移除');
        removeButton.type = 'button';
        removeButton.addEventListener('click', () => {
          state.profile[group].splice(entryIndex, 1);
          markDirty();
          renderEditor();
          document.querySelector(`[data-group="${group}"]`).open = true;
        });
        heading.append(removeButton);
        const grid = makeElement('div', 'fields-grid');
        groupFields[group].forEach(([key, label]) => grid.append(editorField(`${group}.${entryIndex}.${key}`, label, entry[key])));
        card.append(heading, grid);
        body.append(card);
      });
      const addButton = makeElement('button', 'button add', `＋ 添加${groupLabel}`);
      addButton.type = 'button';
      addButton.addEventListener('click', () => {
        if (entries.length >= 30) return notice('每类最多支持 30 条资料。', true);
        entries.push(Object.fromEntries(groupFields[group].map(([key]) => [key, ''])));
        markDirty();
        renderEditor();
        document.querySelector(`[data-group="${group}"]`).open = true;
      });
      body.append(addButton);
    }
    section.append(summary, body);
    fragment.append(section);
  });
  elements['profile-editor'].replaceChildren(fragment);
  elements['resume-text'].value = state.profile.rawText || '';
  updateSavedState();
}

function hasProfileData() {
  return buildCandidates(state.profile).some(candidate => candidate.value?.trim());
}

function allowReplacement() {
  return !hasProfileData() || window.confirm('导入会替换当前资料。需要保留旧资料时，请先取消并点击「导出备份」。是否继续？');
}

function applyImportedProfile(profile, warnings, source) {
  state.profile = normalizeProfile(profile);
  markDirty();
  renderEditor();
  showView('profile');
  elements['import-status'].textContent = `${source} · 已读取到本机。${state.profile.education.length} 段教育、${state.profile.experience.length} 段实习 / 工作、${state.profile.projects.length} 个项目，请校对后保存。`;
  const message = warnings.length ? `已读取，请核对后保存。${warnings.join(' ')}` : '已读取，请检查姓名、学历学位、经历和日期，再点击「确认并保存资料」。';
  notice(message);
}

async function importFile(file) {
  if (!file || state.busy || !allowReplacement()) return;
  state.busy = true;
  elements['resume-file'].disabled = true;
  elements['import-status'].textContent = `正在本机读取 ${file.name}…`;
  try {
    const imported = await importResumeFile(file);
    const parsed = imported.profile ? { profile: imported.profile, warnings: [] } : parseResumeText(imported.text);
    applyImportedProfile(parsed.profile, [...imported.warnings, ...parsed.warnings], file.name);
  } finally {
    state.busy = false;
    elements['resume-file'].disabled = false;
    elements['resume-file'].value = '';
  }
}

async function saveProfile() {
  state.profile.rawText = elements['resume-text'].value;
  const normalized = normalizeProfile(state.profile);
  await writeStorage(normalized);
  state.profile = normalized;
  state.saved = true;
  state.dirty = false;
  state.candidates = buildCandidates(normalized);
  resetPreview();
  renderEditor();
  notice(`资料已保存在本机，共 ${state.candidates.length} 项可选内容。可以切换到「网页预填」。`);
}

function requireSavedProfile() {
  if (!state.saved || state.dirty) throw new Error('请先在「我的资料」中校对并保存，再识别或填写网页。');
  if (!state.candidates.length) throw new Error('尚无可用资料，请先补充姓名、联系方式或经历后保存。');
}

async function getDemoBridge() {
  const frame = elements['demo-frame'];
  const bridge = frame.contentWindow?.__resumeFillBridge;
  if (!bridge) throw new Error('练习表单正在加载，请稍后重试。');
  return bridge;
}

async function scanPage() {
  requireSavedProfile();
  if (state.busy) return;
  state.busy = true;
  elements['scan-page'].disabled = true;
  elements['scan-page'].textContent = '识别中…';
  let currentTab = null;
  try {
    let scan;
    if (demoMode) {
      scan = await (await getDemoBridge()).scan();
      state.target = { demo: true, title: '星舟科技 · 校园招聘练习表单' };
    } else {
      if (!extensionMode) throw new Error('请先把插件加载到 Chrome / Edge，或点击底部「打开练习表单」体验。');
      currentTab = await queryActiveTab();
      if (!currentTab?.id) throw new Error('未找到当前标签页，请打开招聘网站后重新识别。');
      scan = await scanTab(currentTab.id);
      state.target = scan.target;
    }
    if (!scan?.ok) throw new Error(scan?.error || '页面识别失败，请刷新后重新打开插件。');
    state.permissionTab = null;
    elements['page-access-card'].classList.add('hidden');
    state.matches = scan.fields.map(field => {
      const suggestion = suggestForField(field, state.candidates);
      return { field, key: suggestion?.key || '', value: suggestion?.value || '', confidence: suggestion?.confidence || 'none', reason: suggestion?.reason || '请选择资料或手动编辑。', selected: suggestion?.confidence === 'high' && Boolean(suggestion?.value) && !String(field.value || '').trim() && !['checkbox', 'combobox', 'custom', 'custom-select'].includes(field.kind), result: null };
    });
    elements['page-title'].textContent = state.target.title;
    elements['page-subtitle'].textContent = `本页识别到 ${scan.fields.length} 个字段 · 翻页后请重新识别`;
    elements['scan-warnings'].textContent = (scan.warnings || []).join('\n');
    elements['scan-warnings'].classList.toggle('hidden', !scan.warnings?.length);
    renderMatches();
    notice(scan.fields.length ? '请核对字段与预填内容，只有勾选的项目才会填写。' : '未找到可编辑字段。请展开表单，或复制资料手动粘贴。', !scan.fields.length);
  } catch (error) {
    resetPreview();
    const permission = permissionForTab(currentTab);
    if (error.code === 'PAGE_PERMISSION' && permission) {
      state.permissionTab = { tabId: currentTab.id, ...permission };
      elements['page-title'].textContent = currentTab.title || permission.displayHost;
      elements['page-subtitle'].textContent = `等待连接 ${permission.displayHost}`;
      elements['page-access-message'].textContent = `尚未获得 ${permission.displayHost} 的访问权限。点击下方按钮允许访问，再识别本页表单。`;
      elements['grant-page-access'].textContent = `允许访问 ${permission.displayHost}`;
      elements['page-access-card'].classList.remove('hidden');
      notice('已找到当前网站，等待你授权访问。资料仍保存在本机。');
      return;
    }
    if (error.code === 'PAGE_PERMISSION') throw new Error('浏览器暂未允许访问此页。请在目标页面点击工具栏的插件图标后再试；本地文件需在扩展详情中允许访问文件网址。');
    throw error;
  } finally {
    state.busy = false;
    elements['scan-page'].disabled = false;
    elements['scan-page'].textContent = '重新识别';
    updateSelection();
  }
}

elements['grant-page-access'].addEventListener('click', runAction(async () => {
  const pending = state.permissionTab;
  if (!pending || state.busy) return;
  const grantedPromise = chrome.permissions.request({ origins: [pending.originPattern] });
  elements['grant-page-access'].disabled = true;
  try {
    const granted = await grantedPromise;
    if (!granted) {
      notice(`尚未允许访问 ${pending.displayHost}。可以再次授权，或在「我的资料」中复制内容手动填写。`, true);
      return;
    }
    const activeTab = await queryActiveTab();
    if (activeTab?.id !== pending.tabId || permissionForTab(activeTab)?.originPattern !== pending.originPattern) {
      resetPreview();
      notice('网站访问权限已更新。当前页面已变化，请在目标招聘页面重新识别。');
      return;
    }
    await scanPage();
  } finally {
    elements['grant-page-access'].disabled = false;
  }
}));

function blockedByExisting(match) {
  return Boolean(String(match.field.value || '').trim()) && !elements['allow-overwrite'].checked;
}

function updateSelection() {
  const selected = state.matches.filter(match => match.selected && String(match.value).trim() && !blockedByExisting(match));
  elements['selection-count'].textContent = state.matches.length ? `${state.matches.length} 个字段 · 已选 ${selected.length} 项` : '尚未识别字段';
  elements['field-count'].textContent = String(state.matches.length);
  elements['fill-summary'].textContent = selected.length ? `准备处理 ${selected.length} 项内容` : '由你决定填哪些';
  elements['fill-selected'].disabled = !selected.length || state.busy;
  elements['copy-selected'].disabled = !selected.length || state.busy;
}

function renderMatches() {
  const fragment = document.createDocumentFragment();
  if (!state.matches.length) {
    const empty = makeElement('div', 'empty-state');
    empty.append(makeElement('span', 'empty-icon', '▤'), makeElement('h3', '', '等待识别当前网页'), makeElement('p', '', '先保存资料，再识别当前页。可以逐项选择资料，也可以直接编辑预填内容。'));
    fragment.append(empty);
  }
  state.matches.forEach((match, matchIndex) => {
    const card = makeElement('article', `field-card${match.selected ? ' is-selected' : ''}`);
    card.dataset.fieldId = match.field.id;
    const top = makeElement('div', 'field-top');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `select-field-${matchIndex}`;
    checkbox.checked = match.selected && !blockedByExisting(match);
    checkbox.disabled = blockedByExisting(match);
    const title = makeElement('label', 'field-title');
    title.htmlFor = checkbox.id;
    title.append(makeElement('strong', '', `${match.field.label || '未命名字段'}${match.field.required ? ' *' : ''}`), makeElement('small', '', match.field.section || '当前页面'));
    const confidenceText = match.confidence === 'high' ? '建议匹配' : match.confidence === 'none' ? '待选择' : '请核对';
    const badge = makeElement('span', `confidence ${match.confidence}`, confidenceText);
    top.append(checkbox, title, badge);
    card.append(top);
    if (String(match.field.value || '').trim()) card.append(makeElement('div', 'existing-value', `网页已有：${String(match.field.value).slice(0, 180)}${blockedByExisting(match) ? '（保留）' : ''}`));
    const select = document.createElement('select');
    select.setAttribute('aria-label', `为${match.field.label}选择资料`);
    select.append(new Option('选择一项资料，或在下面直接编辑', ''));
    Object.entries(groupNames).forEach(([group, label]) => {
      const candidates = state.candidates.filter(candidate => candidate.group === group);
      if (!candidates.length) return;
      const optionGroup = document.createElement('optgroup');
      optionGroup.label = label;
      candidates.forEach(candidate => optionGroup.append(new Option(candidate.label, candidate.key)));
      select.append(optionGroup);
    });
    select.value = match.key;
    const valueInput = document.createElement('textarea');
    valueInput.rows = String(match.value).includes('\n') ? 4 : 2;
    valueInput.value = match.value;
    valueInput.maxLength = 16000;
    valueInput.setAttribute('aria-label', `${match.field.label}的预填内容`);
    valueInput.placeholder = '未匹配时，可选择资料或手动输入。';
    const bottom = makeElement('div', 'field-bottom');
    const reason = makeElement('span', 'field-reason', match.reason);
    const copy = makeElement('button', 'text-button', '复制此项');
    copy.type = 'button';
    copy.addEventListener('click', runAction(async () => { await copyText(match.value); notice(`已复制「${match.field.label}」的预填内容。`); }));
    bottom.append(reason, copy);
    checkbox.addEventListener('change', () => {
      match.selected = checkbox.checked;
      card.classList.toggle('is-selected', match.selected);
      updateSelection();
    });
    select.addEventListener('change', () => {
      const candidate = state.candidates.find(item => item.key === select.value);
      match.key = candidate?.key || '';
      match.value = candidate?.value || '';
      valueInput.value = match.value;
      match.confidence = 'medium';
      match.reason = '由你选择的资料，请核对后勾选。';
      reason.textContent = match.reason;
      badge.textContent = '请核对';
      badge.className = 'confidence medium';
      updateSelection();
    });
    valueInput.addEventListener('input', () => {
      match.key = '';
      match.value = valueInput.value;
      select.value = '';
      match.reason = '已手动编辑，此次填写不会修改个人档案。';
      reason.textContent = match.reason;
      updateSelection();
    });
    card.append(select, valueInput, bottom);
    if (match.result) card.append(makeElement('div', `result ${match.result.status}`, `${{ filled: '✓ 已填入', skipped: '已跳过', manual: '请手动处理', error: '未完成' }[match.result.status] || '提示'} · ${match.result.message || ''}`));
    fragment.append(card);
  });
  elements['field-list'].replaceChildren(fragment);
  updateSelection();
}

function selectedMatches() {
  return state.matches.filter(match => match.selected && String(match.value).trim() && !blockedByExisting(match));
}

async function fillSelected() {
  requireSavedProfile();
  if (state.busy) return;
  const selected = selectedMatches();
  if (!selected.length || !state.target) throw new Error('请先识别网页并勾选需要填写的内容。');
  state.busy = true;
  updateSelection();
  try {
    const entries = selected.map(match => ({ id: match.field.id, value: match.value, overwrite: elements['allow-overwrite'].checked }));
    let response;
    if (state.target.demo) response = await (await getDemoBridge()).fill(entries);
    else response = await fillTab(state.target, entries);
    if (!response?.ok) throw new Error(response?.error || '填写未完成，请重新识别页面。');
    response.results.forEach(result => {
      const match = state.matches.find(item => item.field.id === result.id);
      if (!match) return;
      match.result = result;
      if (result.status === 'filled') {
        match.field.value = result.value ?? match.value;
        match.selected = false;
      }
    });
    const filledCount = response.results.filter(result => result.status === 'filled').length;
    notice(`已填入 ${filledCount} 项，${response.results.length - filledCount} 项跳过或需手动处理。请检查网页实际结果；页面未提交。`);
    renderMatches();
  } finally {
    state.busy = false;
    updateSelection();
  }
}

elements['profile-tab'].addEventListener('click', () => showView('profile'));
elements['fill-tab'].addEventListener('click', () => showView('fill'));
elements['go-fill'].addEventListener('click', runAction(() => { requireSavedProfile(); showView('fill'); }));
elements['save-profile'].addEventListener('click', runAction(saveProfile));
elements['resume-file'].addEventListener('change', runAction(event => importFile(event.target.files[0])));
elements['resume-text'].addEventListener('input', () => { state.profile.rawText = elements['resume-text'].value; markDirty(); });
elements['parse-text'].addEventListener('click', runAction(() => {
  const text = elements['resume-text'].value.trim();
  if (!text) throw new Error('请先粘贴简历文字。');
  if (text.length > 200000) throw new Error('文字过长，请保留简历相关内容后再提取。');
  if (!allowReplacement()) return;
  const parsed = parseResumeText(text);
  applyImportedProfile(parsed.profile, parsed.warnings, '粘贴的简历');
}));
elements['drop-zone'].addEventListener('dragover', event => { event.preventDefault(); elements['drop-zone'].classList.add('dragging'); });
elements['drop-zone'].addEventListener('dragleave', () => elements['drop-zone'].classList.remove('dragging'));
elements['drop-zone'].addEventListener('drop', runAction(async event => {
  event.preventDefault();
  elements['drop-zone'].classList.remove('dragging');
  await importFile(event.dataTransfer.files[0]);
}));
elements['load-sample'].addEventListener('click', () => {
  if (allowReplacement()) applyImportedProfile(sampleProfile, ['示例资料全部虚构，仅用于练习，请勿用于真实投递。'], '示例资料');
});
elements['export-profile'].addEventListener('click', runAction(() => {
  const blob = new Blob([JSON.stringify(normalizeProfile(state.profile), null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = '我的网申资料.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  notice('已导出资料备份。备份包含个人信息，请妥善保存。');
}));
elements['clear-profile'].addEventListener('click', runAction(async () => {
  if (!window.confirm('清除插件保存在本机的全部资料？此操作不会删除已导出的文件，也不会撤销已填入网页的内容。')) return;
  if (extensionMode) await chrome.storage.local.remove(storageKey);
  else localStorage.removeItem(storageKey);
  state.profile = emptyProfile();
  state.saved = false;
  state.dirty = false;
  state.candidates = [];
  resetPreview();
  renderEditor();
  elements['import-status'].textContent = '本机资料已清除，可重新导入。';
  notice('已清除插件中的本机资料。');
}));
elements['scan-page'].addEventListener('click', runAction(scanPage));
elements['allow-overwrite'].addEventListener('change', () => {
  state.matches.forEach(match => { if (blockedByExisting(match)) match.selected = false; });
  renderMatches();
});
elements['select-reliable'].addEventListener('click', () => {
  state.matches.forEach(match => { match.selected = match.confidence === 'high' && Boolean(String(match.value).trim()) && !blockedByExisting(match) && !['checkbox', 'combobox', 'custom', 'custom-select'].includes(match.field.kind); });
  renderMatches();
});
elements['deselect-all'].addEventListener('click', () => { state.matches.forEach(match => { match.selected = false; }); renderMatches(); });
elements['copy-selected'].addEventListener('click', runAction(async () => {
  const selected = selectedMatches();
  await copyText(selected.map(match => `${match.field.section ? `${match.field.section} / ` : ''}${match.field.label}：${match.value}`).join('\n\n'));
  notice(`已复制 ${selected.length} 项，可粘贴到需要的位置。`);
}));
elements['fill-selected'].addEventListener('click', runAction(fillSelected));
elements['open-demo'].addEventListener('click', runAction(async () => {
  const url = new URL('index.html?demo=1', location.href).href;
  if (extensionMode) await chrome.tabs.create({ url });
  else window.open(url, '_blank', 'noopener');
}));

async function initialize() {
  if (demoMode) {
    document.body.classList.add('demo-mode');
    elements['demo-workspace'].classList.remove('hidden');
    elements['demo-frame'].src = 'demo.html';
  }
  try {
    const saved = await readStorage();
    if (saved) {
      state.profile = normalizeProfile(saved);
      state.saved = true;
      state.candidates = buildCandidates(state.profile);
    }
  } catch { notice('本机资料读取失败，请重新导入备份或补充资料后保存。', true); }
  renderEditor();
  resetPreview();
}

await initialize();
