import test from 'node:test';
import assert from 'node:assert/strict';
import { pdfPageText } from '../src/lib/importer.js';

function item(text, x, y, width = text.length * 10, height = 10, hasEOL = false) {
  return { str: text, transform: [height, 0, 0, height, x, y], width, height, hasEOL };
}

test('PDF text follows visual rows rather than object drawing order or hasEOL fragments', () => {
  const content = { items: [
    item('负责测试与需求验收。', 40, 650),
    item('产品经理', 250, 700, 50, 10, true),
    item('2025/01 - 至今', 430, 700, 110, 10, true),
    item('实习经历', 40, 730, 52, 13),
    item('示例科技有限公司', 26, 700, 90, 10.6),
    item('业务模块', 26, 675, 40),
  ] };
  assert.equal(pdfPageText(content), '实习经历\n示例科技有限公司\t产品经理\t2025/01 - 至今\n业务模块\n负责测试与需求验收。');
});

test('contiguous Chinese glyphs join without spaces while genuine gaps remain readable', () => {
  const content = { items: [item('工程师', 60, 100), item('数据', 40, 100), item('2025/01', 150, 100, 40), item('- 至今', 193, 100, 30)] };
  assert.equal(pdfPageText(content), '数据工程师\t2025/01 - 至今');
});

test('mixed font sizes keep a large name above adjacent contact metadata', () => {
  const content = { items: [item('状态：在职', 206, 800, 70, 10), item('测试同学', 80, 786, 100, 25), item('产品经理', 80, 763, 65, 13)] };
  assert.equal(pdfPageText(content).split('\n')[0], '测试同学');
});

test('persistent two-column text reads each column without mixing same-height lines', () => {
  const items = [item('SUMMARY', 40, 790, 500, 14)];
  for (let index = 0; index < 6; index += 1) {
    items.push(item(`L${index}`, 40, 750 - index * 16, 180), item(`R${index}`, 330, 750 - index * 16, 180));
  }
  const text = pdfPageText({ items: items.reverse() }, { width: 595, transform: [1, 0, 0, -1, 0, 842] });
  assert.deepEqual(text.split('\n'), ['SUMMARY', 'L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'R0', 'R1', 'R2', 'R3', 'R4', 'R5']);
});

test('single-column body remains intact despite company-role-date header gaps', () => {
  const items = [item('EXPERIENCE', 40, 790, 100), item('Example Company', 26, 760, 150), item('Product Manager', 250, 760, 80), item('2025/01 - 2025/06', 430, 760, 130)];
  for (let index = 0; index < 8; index += 1) items.push(item(`Body line ${index}`, 40, 730 - index * 15, 520));
  const lines = pdfPageText({ items: items.reverse() }).split('\n');
  assert.equal(lines[1], 'Example Company\tProduct Manager\t2025/01 - 2025/06');
  assert.equal(lines[2], 'Body line 0');
  assert.equal(lines.at(-1), 'Body line 7');
});
