import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(process.env.NODE_MODULES_PATH ? path.join(path.resolve(process.env.NODE_MODULES_PATH), '__resume_test__.cjs') : import.meta.url);
const { chromium } = require('playwright');
const JSZip = require('jszip');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const root = path.resolve(fileURLToPath(new URL('../src/', import.meta.url)));
const server = createServer(async (request, response) => {
  if (request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<!doctype html><script src="/vendor/jszip.min.js"></script>');
    return;
  }
  if (request.url === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }
  try {
    const filename = path.resolve(root, `.${decodeURIComponent(request.url.split('?')[0])}`);
    if (!filename.startsWith(`${root}${path.sep}`) && filename !== root) {
      response.writeHead(403);
      response.end();
      return;
    }
    const bytes = await readFile(filename);
    response.writeHead(200, { 'Content-Type': /\.m?js$/.test(filename) ? 'text/javascript' : 'application/octet-stream' });
    response.end(bytes);
  } catch (error) {
    console.error(request.url, error.message);
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, headless: true });
  const page = await browser.newPage();
  const remoteRequests = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:')) remoteRequests.push(request.url());
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  document.addPage().drawText('Example Resume\nEmail: tester@example.com', { font, size: 12, x: 50, y: 700 });
  const pdf = [...await document.save()];
  const layoutDocument = await PDFDocument.create();
  const layoutFont = await layoutDocument.embedFont(StandardFonts.Helvetica);
  const firstLayoutPage = layoutDocument.addPage([595, 842]);
  const draw = (page, text, x, y, size = 10) => page.drawText(text, { font: layoutFont, size, x, y });
  draw(firstLayoutPage, 'Delivered a local prototype.', 40, 650);
  draw(firstLayoutPage, 'Product Manager', 250, 700);
  draw(firstLayoutPage, '2025/01 - Present', 430, 700);
  draw(firstLayoutPage, 'EXPERIENCE', 40, 730, 13);
  draw(firstLayoutPage, 'Example Company', 26, 700, 10.6);
  const secondLayoutPage = layoutDocument.addPage([595, 842]);
  draw(secondLayoutPage, 'First project details.', 40, 620);
  draw(secondLayoutPage, 'Second project details.', 40, 570);
  draw(secondLayoutPage, '[Project One | 2024.01 - 2024.03]', 26, 640);
  draw(secondLayoutPage, 'PROJECTS', 40, 700, 13);
  draw(secondLayoutPage, '[Project Two | 2024.04 - 2024.06]', 26, 590);
  draw(secondLayoutPage, 'Continued experience details.', 40, 760);
  draw(secondLayoutPage, 'Experience continuation', 26, 780);
  draw(secondLayoutPage, 'Example Team', 26, 670, 10.6);
  draw(secondLayoutPage, 'Data Analyst', 250, 670);
  draw(secondLayoutPage, '2024/01 - 2024/06', 430, 670);
  const layoutPdf = [...await layoutDocument.save()];
  const zip = new JSZip();
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>姓名：张三</w:t></w:r></w:p><w:p><w:r><w:t>邮箱：test@example.com</w:t></w:r></w:p></w:body></w:document>');
  const docx = [...await zip.generateAsync({ type: 'uint8array' })];
  const blankDocument = await PDFDocument.create();
  blankDocument.addPage();
  const blankPdf = [...await blankDocument.save()];
  const largeZip = new JSZip();
  largeZip.file('word/document.xml', '<w:p>' + 'x'.repeat(6 * 1024 * 1024) + '</w:p>');
  const oversizedDocx = await largeZip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const forgedDocx = oversizedDocx.slice();
  const forgedView = new DataView(forgedDocx.buffer);
  for (let offset = 0; offset < forgedDocx.length - 46; offset += 1) {
    if (forgedView.getUint32(offset, true) === 0x02014b50) forgedView.setUint32(offset + 24, 1, true);
  }
  const entityZip = new JSZip();
  entityZip.file('word/document.xml', '<!DOCTYPE p [<!ENTITY example SYSTEM "https://example.com/private">]><p>&example;</p>');
  const entityDocx = [...await entityZip.generateAsync({ type: 'uint8array' })];
  const results = await page.evaluate(async ({ pdf, layoutPdf, docx, blankPdf, oversizedDocx, forgedDocx, entityDocx }) => {
    const { importResumeFile } = await import('/lib/importer.js');
    const parsedPdf = await importResumeFile(new File([new Uint8Array(pdf)], 'resume.pdf'));
    const parsedLayoutPdf = await importResumeFile(new File([new Uint8Array(layoutPdf)], 'layout.pdf'));
    const parsedDocx = await importResumeFile(new File([new Uint8Array(docx)], 'resume.docx'));
    const parsedText = await importResumeFile(new File(['姓名：张三\n邮箱：test@example.com'], 'resume.txt'));
    const parsedJson = await importResumeFile(new File([JSON.stringify({ profile: { basic: { name: '张三' } } })], 'resume.json'));
    const errors = [];
    for (const file of [new File(['x'], 'old.doc'), new File([], 'empty.txt'), new File(['bad'], 'broken.pdf')]) {
      try {
        await importResumeFile(file);
        errors.push(null);
      } catch (error) {
        errors.push(error.message);
      }
    }
    const safetyErrors = [];
    for (const [filename, bytes] of [['blank.pdf', blankPdf], ['oversized.docx', oversizedDocx], ['forged.docx', forgedDocx], ['entity.docx', entityDocx]]) {
      try {
        await importResumeFile(new File([new Uint8Array(bytes)], filename));
        safetyErrors.push(null);
      } catch (error) {
        safetyErrors.push(error.message);
      }
    }
    return { parsedPdf, parsedLayoutPdf, parsedDocx, parsedText, parsedJson, errors, safetyErrors };
  }, { pdf, layoutPdf, docx, blankPdf, oversizedDocx: [...oversizedDocx], forgedDocx: [...forgedDocx], entityDocx });
  assert.match(results.parsedPdf.text, /tester@example\.com/);
  assert.equal(results.parsedLayoutPdf.text, 'EXPERIENCE\nExample Company\tProduct Manager\t2025/01 - Present\nDelivered a local prototype.\n\nExperience continuation\nContinued experience details.\nPROJECTS\nExample Team\tData Analyst\t2024/01 - 2024/06\n[Project One | 2024.01 - 2024.03]\nFirst project details.\n[Project Two | 2024.04 - 2024.06]\nSecond project details.');
  assert.match(results.parsedDocx.text, /姓名：张三\n邮箱：test@example\.com/);
  assert.match(results.parsedText.text, /张三/);
  assert.equal(results.parsedJson.profile.basic.name, '张三');
  assert.ok(results.errors.every((message) => typeof message === 'string' && message.length > 0));
  assert.match(results.safetyErrors[0], /没有可读取的文字/);
  assert.match(results.safetyErrors[1], /正文过大/);
  assert.match(results.safetyErrors[2], /正文解压后过大/);
  assert.match(results.safetyErrors[3], /XML 声明/);
  assert.deepEqual(remoteRequests, []);
  console.log(JSON.stringify({ status: 'passed', checks: ['PDF worker extraction', 'two-page out-of-drawing-order PDF layout reconstruction', 'DOCX unzip and paragraphs', 'TXT UTF-8', 'JSON wrapper', 'unsupported/empty/corrupt files', 'blank PDF', 'oversized ZIP metadata', 'forged ZIP streamed limit', 'XML entity rejection', 'no remote requests'], results }, null, 2));
} finally {
  try {
    if (browser) await browser.close();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
