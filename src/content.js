(() => {
  if (globalThis.__resumeFillBridge?.version === 1) return;

  const registry = new Map();
  const identifiers = new WeakMap();
  const selector = 'input,textarea,select,[role="combobox"]';
  const excludedTypes = new Set(['hidden', 'password', 'file', 'submit', 'reset', 'button', 'image', 'range', 'color']);
  let nextIdentifier = 1;

  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const comparable = (value) => clean(value).toLocaleLowerCase();
  const limit = (value, length = 160) => clean(value).slice(0, length);
  const normalizedLabel = (value) => limit(value).replace(/^\s*[*＊]+\s*/, '').replace(/(?:\s*[:：*＊]\s*|\s*[（(](?:必填|required)[)）]\s*)+$/gi, '').trim();

  function identifier(element) {
    if (!identifiers.has(element)) identifiers.set(element, `rf-${nextIdentifier++}`);
    return identifiers.get(element);
  }

  function textWithoutControls(element) {
    if (!element) return '';
    const copy = element.cloneNode(true);
    copy.querySelectorAll('input,textarea,select,button,script,style,[role="combobox"],[role="listbox"],[role="option"]').forEach((control) => control.remove());
    return limit(copy.textContent);
  }

  function labelledBy(element) {
    const root = element.getRootNode();
    return clean((element.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map((reference) => {
      const target = root.getElementById?.(reference) || element.ownerDocument.getElementById(reference);
      return textWithoutControls(target);
    }).join(' '));
  }

  function isVisible(element) {
    if (!element?.isConnected || element.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    const view = element.ownerDocument.defaultView;
    if (!view) return false;
    try {
      if (view.document !== element.ownerDocument || (view.frameElement && !isVisible(view.frameElement))) return false;
    } catch {
      return false;
    }
    const style = view.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse' && element.getClientRects().length > 0;
  }

  function controlVisible(element) {
    if (isVisible(element)) return true;
    return ['radio', 'checkbox'].includes(element.type) && Array.from(element.labels || []).some(isVisible);
  }

  function wrapperLabel(element) {
    const wrapper = element.closest('.form-item,.form-group,.field,[class*="form-item"],[class*="FormItem"],[class*="formItem"],[data-field]');
    if (!wrapper) return '';
    const label = Array.from(wrapper.querySelectorAll('label,[class*="label"],[class*="Label"]')).find((candidate) => !candidate.contains(element) && !candidate.querySelector(selector) && (!candidate.htmlFor || candidate.htmlFor === element.id));
    if (!label) return '';
    return textWithoutControls(label);
  }

  function controlLabel(element) {
    const explicit = labelledBy(element) || element.getAttribute('aria-label');
    if (clean(explicit)) return limit(explicit);
    const ownLabels = Array.from(element.labels || []).map(textWithoutControls).filter(Boolean);
    if (ownLabels.length) return limit(ownLabels.join(' '));
    const wrapped = wrapperLabel(element);
    if (wrapped) return wrapped;
    const previous = element.previousElementSibling;
    if (previous && !previous.matches(selector) && !previous.querySelector(selector)) {
      const previousText = textWithoutControls(previous);
      if (previousText && previousText.length <= 65) return previousText;
    }
    const parent = element.parentElement;
    if (parent && parent.querySelectorAll(selector).length === 1) {
      const parentText = textWithoutControls(parent);
      if (parentText && parentText.length <= 65) return parentText;
    }
    return limit(element.getAttribute('placeholder') || element.getAttribute('title') || element.name || '未命名字段');
  }

  function groupLabel(element) {
    const group = element.closest('[role="radiogroup"],fieldset');
    if (group) {
      const explicit = labelledBy(group) || group.getAttribute('aria-label');
      if (explicit) return limit(explicit);
      const legend = group.querySelector(':scope > legend');
      if (legend) return textWithoutControls(legend);
    }
    const wrapped = wrapperLabel(element);
    if (wrapped) return wrapped;
    let parent = element.parentElement;
    for (let depth = 0; parent && depth < 4; depth++, parent = parent.parentElement) {
      if (parent.querySelectorAll('input[type="radio"]').length < 2) continue;
      const candidate = parent.querySelector(':scope > label,:scope > legend,:scope > [class*="label"],:scope > [class*="Label"]');
      if (candidate && !candidate.querySelector('input')) return textWithoutControls(candidate);
    }
    return limit(element.name || controlLabel(element));
  }

  function sectionFor(element) {
    const sectionPattern = /教育|学历|学位|实习|工作|任职|项目|科研|校园|社会实践|基本信息|个人信息|联系方式|求职|意向|技能|证书|获奖|语言|推荐人|紧急联系人|家庭成员|父亲|母亲|配偶|监护人|education|experience|employment|project|personal|contact|skill|award|reference|referee|emergency|guardian|spouse/i;
    let ancestor = element.parentElement;
    for (let depth = 0; ancestor && depth < 10; depth++, ancestor = ancestor.parentElement) {
      const explicit = ancestor.getAttribute('data-section') || ancestor.getAttribute('aria-label');
      if (explicit && sectionPattern.test(explicit)) return limit(explicit, 75);
      const heading = ancestor.querySelector(':scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > legend,:scope > header > h2,:scope > header > h3');
      const headingText = textWithoutControls(heading);
      if (headingText && sectionPattern.test(headingText)) return limit(headingText, 75);
      let sibling = ancestor.previousElementSibling;
      for (let count = 0; sibling && count < 8; count++, sibling = sibling.previousElementSibling) {
        if (!sibling.matches('h1,h2,h3,h4,legend,[role="heading"]')) continue;
        const siblingText = textWithoutControls(sibling);
        if (sectionPattern.test(siblingText)) return limit(siblingText, 75);
      }
    }
    return '';
  }

  function currentValue(record) {
    if (record.kind === 'radio') return radioPeers(record.element).find((element) => element.checked)?.value || '';
    if (record.kind === 'checkbox') return record.element.checked ? 'true' : '';
    if (record.kind === 'custom-select') return clean(record.element.value ?? record.element.textContent);
    if (record.kind === 'select' && !record.element.multiple) {
      const selected = record.element.selectedOptions[0];
      if (selected && /^(请选择.*|请选取.*|选择[.…]*|please select.*|select[.…]*|[-—\s]+)$/i.test(clean(selected.label))) return '';
    }
    return String(record.element.value ?? '');
  }

  function optionFor(element) {
    return { value: String(element.value ?? ''), label: limit(element.label || element.textContent), disabled: Boolean(element.disabled || element.parentElement?.disabled) };
  }

  function radioPeers(element) {
    if (!element.name) return [element];
    return Array.from(element.getRootNode().querySelectorAll('input[type="radio"]')).filter((candidate) => candidate.name === element.name && candidate.form === element.form);
  }

  function radioSignature(element) {
    return JSON.stringify(radioPeers(element).map((candidate) => ({
      value: candidate.value,
      label: controlLabel(candidate),
      disabled: candidate.disabled || candidate.matches(':disabled'),
      visible: controlVisible(candidate)
    })));
  }

  function scan() {
    registry.clear();
    const fields = [];
    const roots = new Set();
    const radioGroups = new Map();
    const warnings = new Set();

    function visit(root) {
      if (roots.has(root)) return;
      roots.add(root);
      const controls = Array.from(root.querySelectorAll(selector));
      for (const element of controls) {
        if (fields.length >= 500) {
          warnings.add('当前页面字段较多，仅显示前 500 项。');
          break;
        }
        const tag = element.tagName.toLowerCase();
        const type = clean(element.type).toLowerCase();
        const custom = element.getAttribute('role') === 'combobox' && tag !== 'select';
        if ((excludedTypes.has(type) && !(custom && tag === 'button')) || element.disabled || element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true' || (!custom && element.readOnly) || !controlVisible(element)) continue;
        if (!custom && element.parentElement?.closest('[role="combobox"]')) continue;
        let kind = tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea' : custom ? 'custom-select' : 'input';
        if (type === 'checkbox') kind = 'checkbox';
        if (type === 'radio') kind = 'radio';
        let record;
        if (kind === 'radio') {
          const owner = element.form || root;
          if (!radioGroups.has(owner)) radioGroups.set(owner, new Map());
          const groups = radioGroups.get(owner);
          const key = element.name || identifier(element);
          if (groups.has(key)) {
            record = groups.get(key);
            record.elements.push(element);
            record.field.options.push({ value: element.value, label: controlLabel(element) });
            record.field.required ||= element.required;
            record.field.value = currentValue(record);
            record.snapshot = record.field.value;
            continue;
          }
          record = { kind, element, elements: [element] };
          groups.set(key, record);
        } else {
          record = { kind, element, elements: [element] };
        }
        const field = {
          id: identifier(element),
          label: normalizedLabel(kind === 'radio' ? groupLabel(element) : controlLabel(element)),
          section: sectionFor(element),
          kind,
          type: type || (custom ? 'combobox' : 'text'),
          value: currentValue(record),
          options: kind === 'select' ? Array.from(element.options).map(optionFor) : kind === 'radio' ? [{ value: element.value, label: controlLabel(element) }] : [],
          required: Boolean(element.required || element.getAttribute('aria-required') === 'true'),
          placeholder: limit(element.getAttribute('placeholder') || ''),
          name: limit(element.name || ''),
          autocomplete: limit(element.getAttribute('autocomplete') || ''),
          multiple: Boolean(element.multiple),
          maxLength: element.maxLength > 0 ? element.maxLength : null
        };
        record.field = field;
        record.snapshot = field.value;
        registry.set(field.id, record);
        fields.push(field);
      }
      for (const element of root.querySelectorAll('*')) {
        if (element.shadowRoot && isVisible(element)) visit(element.shadowRoot);
        if (element.tagName !== 'IFRAME' || !isVisible(element)) continue;
        try {
          const frameDocument = element.contentDocument;
          if (frameDocument) visit(frameDocument);
          else warnings.add('页面包含跨域内嵌表单，可在内嵌页面单独打开后扫描，或使用复制。');
        } catch {
          warnings.add('页面包含跨域内嵌表单，可在内嵌页面单独打开后扫描，或使用复制。');
        }
      }
    }

    visit(document);
    for (const record of registry.values()) {
      if (record.kind === 'radio') record.radioSignature = radioSignature(record.element);
    }
    if (fields.some((field) => field.kind === 'custom-select')) warnings.add('自定义搜索下拉框需要手动选择，插件提供内容复制。');
    return { ok: true, fields, warnings: [...warnings] };
  }

  function nativeSet(element, property, value) {
    const view = element.ownerDocument.defaultView;
    const prototype = element.tagName === 'TEXTAREA' ? view.HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? view.HTMLSelectElement.prototype : view.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, property)?.set;
    if (!setter) throw new Error('无法操作此控件，请复制后填写。');
    setter.call(element, value);
  }

  function emitChanges(element) {
    const view = element.ownerDocument.defaultView;
    element.dispatchEvent(new view.Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new view.Event('change', { bubbles: true, composed: true }));
  }

  function formattedValue(record, value) {
    const type = record.element.type;
    const text = String(value).trim().replace(/\r\n?/g, '\n');
    if (type === 'date' || type === 'month') {
      const matched = text.match(/^(\d{4})[-/.年](\d{1,2})(?:[-/.月](\d{1,2})日?)?月?$/);
      if (matched) {
        const year = matched[1];
        const month = matched[2].padStart(2, '0');
        if (type === 'month') return `${year}-${month}`;
        if (matched[3]) return `${year}-${month}-${matched[3].padStart(2, '0')}`;
      }
    }
    return text;
  }

  function result(record, id, status, message) {
    return { id, status, message, value: record ? currentValue(record) : '' };
  }

  async function fill(entries) {
    if (!Array.isArray(entries)) return { ok: false, results: [], error: '填写数据格式不正确。' };
    const results = [];
    const filled = [];
    for (const entry of entries.slice(0, 500)) {
      if (!entry || typeof entry.id !== 'string') {
        results.push(result(null, '', 'error', '字段标识无效，请重新扫描。'));
        continue;
      }
      const record = registry.get(entry.id);
      if (!record || !record.elements.every((element) => element.isConnected)) {
        results.push(result(record, entry.id, 'skipped', '页面已变化，请重新扫描。'));
        continue;
      }
      if (record.elements.some((element) => element.disabled || element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true') || !controlVisible(record.element)) {
        results.push(result(record, entry.id, 'skipped', '字段已隐藏或不可编辑，请重新扫描。'));
        continue;
      }
      const liveLabel = normalizedLabel(record.kind === 'radio' ? groupLabel(record.element) : controlLabel(record.element));
      if (liveLabel !== record.field.label || sectionFor(record.element) !== record.field.section || limit(record.element.name || '') !== record.field.name || (record.kind !== 'custom-select' && clean(record.element.type).toLowerCase() !== record.field.type)) {
        results.push(result(record, entry.id, 'skipped', '字段含义或所属区域已变化，请重新扫描。'));
        continue;
      }
      if (record.kind === 'radio' && radioSignature(record.element) !== record.radioSignature) {
        results.push(result(record, entry.id, 'skipped', '单选候选项已变化，请重新扫描。'));
        continue;
      }
      if (record.kind === 'custom-select') {
        results.push(result(record, entry.id, 'manual', '此字段需要从网页候选项中选择，请复制内容后手动选择。'));
        continue;
      }
      if (record.kind === 'checkbox') {
        results.push(result(record, entry.id, 'manual', '复选项或声明需要你在网页上确认。'));
        continue;
      }
      if (record.element.readOnly) {
        results.push(result(record, entry.id, 'manual', '此字段不可直接输入，请使用网页控件或复制。'));
        continue;
      }
      const proposed = typeof entry.value === 'number' ? String(entry.value) : typeof entry.value === 'string' ? entry.value : '';
      if (!proposed.trim()) {
        results.push(result(record, entry.id, 'skipped', '没有待填写的内容。'));
        continue;
      }
      const before = currentValue(record);
      if (before !== record.snapshot) {
        results.push(result(record, entry.id, 'skipped', '扫描后网页内容发生变化，请重新扫描再确认。'));
        continue;
      }
      if (before && !entry.overwrite) {
        results.push(result(record, entry.id, 'skipped', '已保留网页原有内容。'));
        continue;
      }
      let target = record.element;
      let expected = formattedValue(record, proposed);
      try {
        if (record.kind === 'select' || record.kind === 'radio') {
          if (record.field.multiple) {
            results.push(result(record, entry.id, 'manual', '多选控件请手动选择。'));
            continue;
          }
          const available = record.field.options.filter((option) => !option.disabled);
          const matches = available.filter((option) => comparable(option.label) === comparable(proposed) || comparable(option.value) === comparable(proposed));
          if (matches.length !== 1) {
            results.push(result(record, entry.id, 'manual', matches.length ? '存在多个相同候选项，请手动选择。' : '没有完全匹配的候选项，请手动选择。'));
            continue;
          }
          expected = matches[0].value;
          const sameValueOptions = record.kind === 'select' ? Array.from(target.options).filter((option) => option.value === expected) : radioPeers(target).filter((option) => option.value === expected);
          if (sameValueOptions.length !== 1) {
            results.push(result(record, entry.id, 'manual', '候选项存在重复值，请手动选择。'));
            continue;
          }
          if (record.kind === 'radio') {
            target = record.elements.find((element) => element.value === expected);
            target.click();
          } else {
            const liveOption = Array.from(target.options).find((option) => option.value === expected && !option.disabled && !option.parentElement?.disabled);
            if (!liveOption || comparable(liveOption.label) !== comparable(matches[0].label)) {
              results.push(result(record, entry.id, 'skipped', '候选项已变化，请重新扫描。'));
              continue;
            }
            nativeSet(target, 'value', expected);
            emitChanges(target);
          }
        } else {
          if (target.maxLength > 0 && expected.length > target.maxLength) {
            results.push(result(record, entry.id, 'manual', `内容超过网页的 ${target.maxLength} 字限制，请先缩短。`));
            continue;
          }
          nativeSet(target, 'value', expected);
          if (target.value !== expected) {
            nativeSet(target, 'value', before);
            results.push(result(record, entry.id, 'manual', '内容不符合网页格式，请调整后填写。'));
            continue;
          }
          emitChanges(target);
        }
        const response = result(record, entry.id, 'filled', '已填入，请在网页确认。');
        results.push(response);
        filled.push({ record, expected, response });
      } catch (error) {
        results.push(result(record, entry.id, 'error', error?.message || '填写失败，请复制后填写。'));
      }
    }
    if (filled.length) await new Promise((resolve) => setTimeout(resolve, 120));
    for (const { record, expected, response } of filled) {
      if (!record.elements.every((element) => element.isConnected)) {
        response.status = 'manual';
        response.message = '网页重新渲染了字段，请重新扫描并确认填写结果。';
      } else if (currentValue(record) !== expected) {
        response.status = 'manual';
        response.message = '网页未保留填写值，请使用复制或手动填写。';
      } else if (record.element.validity && !record.element.validity.valid) {
        response.status = 'manual';
        response.message = '内容已填入，但未通过网页的格式验证，请检查后调整。';
      }
      response.value = currentValue(record);
      record.snapshot = response.value;
    }
    return { ok: true, results };
  }

  const bridge = { version: 1, scan, fill };
  globalThis.__resumeFillBridge = bridge;
  if (globalThis.chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (sender.id && sender.id !== chrome.runtime.id) return false;
      if (message?.type === 'RF_SCAN') {
        try {
          respond(scan());
        } catch (error) {
          respond({ ok: false, fields: [], warnings: [], error: error?.message || '页面扫描失败。' });
        }
        return false;
      }
      if (message?.type === 'RF_FILL') {
        fill(message.entries).then(respond, (error) => respond({ ok: false, results: [], error: error?.message || '填写失败。' }));
        return true;
      }
      return false;
    });
  }
})();
