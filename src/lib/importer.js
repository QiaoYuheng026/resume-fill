const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_CHARACTERS = 1_000_000;
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_PDF_PAGES = 30;

function cleanText(text) {
  return text.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

function checkTextLength(text) {
  if (text.length > MAX_TEXT_CHARACTERS) {
    throw new Error('文档文字过多，请仅保留简历内容后重试。');
  }
  return cleanText(text);
}

function readZipDirectory(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error('DOCX 文件结构不完整，请重新保存后导入。');
  const entries = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);
  const directorySize = view.getUint32(endOffset + 12, true);
  if (view.getUint16(endOffset + 4, true) !== 0 || view.getUint16(endOffset + 6, true) !== 0 || entries === 0xffff || offset === 0xffffffff || directorySize === 0xffffffff || entries > 10_000 || offset + directorySize > endOffset) {
    throw new Error('不支持分卷、ZIP64 或结构异常的 DOCX 文件。');
  }
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let documentFound = false;
  for (let entryIndex = 0; entryIndex < entries; entryIndex += 1) {
    if (offset + 46 > endOffset || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('DOCX 文件目录损坏。');
    }
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameSize = view.getUint16(offset + 28, true);
    const extraSize = view.getUint16(offset + 30, true);
    const commentSize = view.getUint16(offset + 32, true);
    const nextOffset = offset + 46 + nameSize + extraSize + commentSize;
    if (nextOffset > endOffset || uncompressedSize === 0xffffffff) throw new Error('DOCX 文件目录异常。');
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameSize));
    totalBytes += uncompressedSize;
    if (totalBytes > MAX_ARCHIVE_BYTES) throw new Error('DOCX 解压体积过大，请移除大量图片等附件后重试。');
    if (name === 'word/document.xml') {
      if (documentFound || uncompressedSize > MAX_DOCUMENT_BYTES) throw new Error('DOCX 正文过大或结构异常。');
      documentFound = true;
    }
    offset = nextOffset;
  }
  if (!documentFound) throw new Error('没有找到 DOCX 正文。旧版 .doc 请另存为 .docx 或复制文字导入。');
}

async function importDocx(file) {
  if (!globalThis.JSZip) throw new Error('本地 DOCX 读取组件未加载，请重新打开插件。');
  const buffer = await file.arrayBuffer();
  readZipDirectory(buffer);
  const archive = await globalThis.JSZip.loadAsync(buffer);
  const documentEntry = archive.file('word/document.xml');
  if (!documentEntry) throw new Error('没有找到 DOCX 正文。');
  let uncompressedBytes = 0;
  const chunks = [];
  await new Promise((resolve, reject) => {
    const stream = documentEntry.internalStream('uint8array');
    stream.on('data', (chunk) => {
      uncompressedBytes += chunk.length;
      if (uncompressedBytes > MAX_DOCUMENT_BYTES) {
        stream.pause();
        reject(new Error('DOCX 正文解压后过大，已停止读取。'));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.resume();
  });
  const xmlBytes = new Uint8Array(uncompressedBytes);
  let cursor = 0;
  for (const chunk of chunks) {
    xmlBytes.set(chunk, cursor);
    cursor += chunk.length;
  }
  const xml = new TextDecoder().decode(xmlBytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('DOCX 正文包含不支持的 XML 声明。');
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('DOCX 正文格式损坏，无法读取。');
  const paragraphs = [...document.getElementsByTagNameNS('*', 'p')];
  const text = checkTextLength(paragraphs.map((paragraph) => {
    const tokens = [...paragraph.getElementsByTagName('*')];
    return tokens.map((token) => {
      if (token.localName === 't') return token.textContent || '';
      if (token.localName === 'tab') return '\t';
      if (token.localName === 'br' || token.localName === 'cr') return '\n';
      return '';
    }).join('');
  }).join('\n'));
  if (!text) throw new Error('DOCX 中没有可读取的文字，图片简历请粘贴文字内容。');
  return { text, profile: null, warnings: ['已在本机提取 DOCX 文字，请校对表格、文本框及多栏内容的顺序。'] };
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
}

function positionedPdfItems(content, viewport) {
  const matrix = viewport?.transform || [1, 0, 0, -1, 0, 0];
  return (content?.items || []).flatMap((item, index) => {
    if (typeof item.str !== 'string' || !item.str.trim() || !Array.isArray(item.transform)) return [];
    const [sourceX, sourceY] = item.transform.slice(4, 6);
    if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) return [];
    const height = Math.abs(item.height) || Math.hypot(item.transform[2], item.transform[3]) || 10;
    const x = matrix[0] * sourceX + matrix[2] * sourceY + matrix[4];
    const y = matrix[1] * sourceX + matrix[3] * sourceY + matrix[5];
    const width = Math.abs(item.width) || item.str.length * height * 0.5;
    return [{ text: item.str, x, y, width, height, index }];
  });
}

function pdfRows(items) {
  const rows = [];
  for (const item of [...items].sort((left, right) => left.y - right.y || left.x - right.x || left.index - right.index)) {
    let row = rows.at(-1);
    const tolerance = row ? Math.max(1, Math.min(row.height, item.height) * 0.24) : 0;
    if (!row || Math.abs(row.y - item.y) > tolerance) {
      row = { y: item.y, height: item.height, top: item.y - item.height, items: [] };
      rows.push(row);
    }
    row.items.push(item);
    row.height = Math.max(row.height, item.height);
    row.top = Math.min(row.top, item.y - item.height);
  }
  for (const row of rows) row.items.sort((left, right) => left.x - right.x || left.index - right.index);
  return rows.sort((left, right) => left.top - right.top || left.items[0].x - right.items[0].x);
}

function columnDivider(rows, pageWidth, textHeight) {
  const candidates = new Map();
  const minimumGap = Math.max(textHeight * 2.5, pageWidth * 0.045);
  for (const row of rows) {
    for (let index = 1; index < row.items.length; index += 1) {
      const previous = row.items[index - 1];
      const current = row.items[index];
      const gap = current.x - previous.x - previous.width;
      if (gap >= minimumGap) {
        const midpoint = (previous.x + previous.width + current.x) / 2;
        candidates.set(Math.round(midpoint / Math.max(2, textHeight)), midpoint);
      }
    }
  }
  let best = null;
  for (const candidate of [...candidates.values()].slice(0, 256)) {
    if (candidate < pageWidth * 0.2 || candidate > pageWidth * 0.8) continue;
    const both = [];
    const crossing = [];
    for (const row of rows) {
      const crosses = row.items.some((item) => item.x < candidate && item.x + item.width > candidate);
      if (crosses) crossing.push(row);
      else if (row.items.some((item) => item.x + item.width <= candidate) && row.items.some((item) => item.x >= candidate)) both.push(row);
    }
    if (both.length < 4 || both.length < crossing.length * 2 || both.at(-1).y - both[0].y < textHeight * 3) continue;
    if (!best || both.length > best.support) best = { x: candidate, support: both.length };
  }
  return best?.x ?? null;
}

function textForPdfRow(items) {
  let text = '';
  let previous = null;
  for (const item of items) {
    if (previous) {
      const gap = item.x - previous.x - previous.width;
      const height = Math.min(previous.height, item.height);
      if (gap > Math.max(8, height * 1.6)) text = text.trimEnd() + '\t';
      else if (gap > Math.max(0.8, height * 0.14) && !/\s$/.test(text) && !/^\s/.test(item.text)) text += ' ';
    }
    text += item.text;
    previous = item;
  }
  return text.trim();
}

function orderedPdfRows(rows, divider) {
  if (divider === null) return rows;
  const ordered = [];
  let block = [];
  const flushBlock = () => {
    const left = [];
    const right = [];
    for (const row of block) {
      const leftItems = row.items.filter((item) => item.x + item.width <= divider);
      const rightItems = row.items.filter((item) => item.x >= divider);
      if (leftItems.length) left.push({ ...row, items: leftItems });
      if (rightItems.length) right.push({ ...row, items: rightItems });
    }
    ordered.push(...left, ...right);
    block = [];
  };
  for (const row of rows) {
    if (row.items.some((item) => item.x < divider && item.x + item.width > divider)) {
      flushBlock();
      ordered.push(row);
    } else block.push(row);
  }
  flushBlock();
  return ordered;
}

export function pdfPageText(content, viewport = null) {
  const items = positionedPdfItems(content, viewport);
  if (!items.length) return '';
  const rows = pdfRows(items);
  const textHeight = median(items.map((item) => item.height)) || 10;
  const pageWidth = viewport?.width || items.reduce((maximum, item) => Math.max(maximum, item.x + item.width), 0);
  const divider = columnDivider(rows, pageWidth, textHeight);
  return orderedPdfRows(rows, divider).map((row) => textForPdfRow(row.items)).filter(Boolean).join('\n');
}

async function importPdf(file) {
  const pdfjs = await import('../vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: new URL('../vendor/pdfjs/cmaps/', import.meta.url).href,
    cMapPacked: true,
    standardFontDataUrl: new URL('../vendor/pdfjs/standard_fonts/', import.meta.url).href,
    isEvalSupported: false,
    useWasm: false,
    disableFontFace: true,
    stopAtErrors: true,
  });
  let timeoutId;
  try {
    const extraction = (async () => {
      const document = await loadingTask.promise;
      if (document.numPages > MAX_PDF_PAGES) throw new Error(`PDF 超过 ${MAX_PDF_PAGES} 页，请仅上传简历部分。`);
      const pages = [];
      let emptyPages = 0;
      let characterCount = 0;
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const text = pdfPageText(await page.getTextContent(), page.getViewport({ scale: 1 }));
        if (!text.trim()) emptyPages += 1;
        characterCount += text.length;
        if (characterCount > MAX_TEXT_CHARACTERS) throw new Error('PDF 文字过多，请仅上传简历部分。');
        pages.push(text);
        page.cleanup();
      }
      const text = checkTextLength(pages.join('\n\n'));
      if (!text) throw new Error('此 PDF 没有可读取的文字，可能是扫描件。请改用文字版 PDF、DOCX，或粘贴简历文字。');
      const warnings = ['已在本机按 PDF 页面坐标恢复文字顺序，请校对多栏排版、空格及特殊字符。'];
      if (emptyPages) warnings.push(`${emptyPages} 页未提取到文字，图片中的内容需要手动补充。`);
      return { text, profile: null, warnings };
    })();
    const timeout = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error('PDF 读取超过 45 秒，已停止。请尝试 DOCX 或粘贴文字。')), 45_000);
    });
    return await Promise.race([extraction, timeout]);
  } catch (error) {
    if (error?.name === 'PasswordException') throw new Error('此 PDF 有密码保护，请在本机解密后导入。');
    if (error?.name === 'InvalidPDFException') throw new Error('PDF 文件损坏或格式不受支持，请重新导出。');
    throw error;
  } finally {
    clearTimeout(timeoutId);
    await loadingTask.destroy().catch(() => {});
  }
}

export async function importResumeFile(file) {
  if (!file || typeof file.name !== 'string' || typeof file.arrayBuffer !== 'function' || typeof file.text !== 'function') {
    throw new Error('请选择一个简历文件。');
  }
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error('文件为空或无法读取。');
  if (file.size > MAX_FILE_BYTES) throw new Error('文件超过 20 MB，请缩小后重试。');
  const extension = file.name.toLowerCase().split('.').pop();
  try {
    if (extension === 'pdf') return await importPdf(file);
    if (extension === 'docx') return await importDocx(file);
    if (extension === 'json') {
      let parsed;
      try {
        parsed = JSON.parse(checkTextLength(await file.text()));
      } catch {
        throw new Error('JSON 格式不正确，请使用插件导出的档案文件。');
      }
      const profile = parsed?.profile ?? parsed;
      if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error('JSON 中没有有效的个人档案。');
      return { text: typeof profile.rawText === 'string' ? checkTextLength(profile.rawText) : '', profile, warnings: [] };
    }
    if (extension === 'txt' || extension === 'md') {
      const text = checkTextLength(await file.text());
      if (!text) throw new Error('文件中没有可读取的文字。');
      return { text, profile: null, warnings: [] };
    }
    throw new Error('支持 PDF、DOCX、TXT、MD 和插件导出的 JSON。旧版 DOC 请先另存为 DOCX。');
  } catch (error) {
    if (error instanceof Error && /[\u3400-\u9fff]/.test(error.message)) throw error;
    throw new Error('文件读取失败，请检查格式，或复制简历文字后粘贴导入。');
  }
}
