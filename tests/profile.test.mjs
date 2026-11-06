import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyProfile, normalizeProfile, parseResumeText, buildCandidates, suggestForField } from '../src/lib/profile.js';

function sampleProfile() {
  const profile = emptyProfile();
  profile.basic = { ...profile.basic, name: '张三', phone: '13812345678', email: 'zhang@example.com', city: '上海', hometown: '杭州', highestEducation: '本科', degree: '学士' };
  profile.education = [
    { school: '甲大学', major: '计算机科学', educationLevel: '本科', degree: '学士', startDate: '2020-09', endDate: '2024-06' },
    { school: '乙大学', major: '软件工程', educationLevel: '硕士研究生', degree: '硕士', startDate: '2024-09', endDate: '2027-06' }
  ];
  profile.experience = [{ company: '某科技公司', role: '研发实习生', startDate: '2025-07', endDate: '2025-09', description: '开发内部管理系统。' }];
  profile.projects = [{ name: '课程系统', role: '前端开发', startDate: '2024-03', endDate: '2024-05', description: '实现选课功能。' }];
  return profile;
}

test('保守提取明确标签、分段与日期，不推算缺失字段', () => {
  const parsed = parseResumeText('姓名：张三 | 手机：13812345678\n邮箱：zhang@example.com\n教育经历\n学校：甲大学\n专业：计算机科学\n学历：本科\n学位：学士\n入学时间：2020年9月\n毕业时间：2024.06\n学校：乙大学\n专业：软件工程\n实习经历\n公司：某科技公司\n职位：研发实习生\n工作内容：开发内部系统\n项目经历\n项目名称：课程系统\n项目描述：实现选课功能');
  assert.equal(parsed.profile.basic.name, '张三');
  assert.equal(parsed.profile.basic.email, 'zhang@example.com');
  assert.equal(parsed.profile.education.length, 2);
  assert.equal(parsed.profile.education[0].startDate, '2020-09');
  assert.equal(parsed.profile.education[0].endDate, '2024-06');
  assert.equal(parsed.profile.education[0].educationLevel, '本科');
  assert.equal(parsed.profile.education[0].degree, '学士');
  assert.equal(parsed.profile.education[0].gpa, '');
  assert.equal(parsed.profile.experience[0].company, '某科技公司');
  assert.equal(parsed.profile.projects[0].name, '课程系统');
  assert.equal(parsed.profile.basic.highestEducation, '');
});

test('不从项目描述的联系方式推断个人资料；多邮箱需确认', () => {
  const parsed = parseResumeText('zhang@example.com other@example.com\n项目经历\n做过一个测试邮箱 demo@example.com，测试号码 13812345678');
  assert.equal(parsed.profile.basic.email, '');
  assert.equal(parsed.profile.basic.phone, '');
  assert.match(parsed.warnings.join(' '), /多个邮箱/);
  assert.match(parsed.profile.projects[0].description, /测试邮箱/);
});

test('不把其他人的标签或联系方式解析为本人资料，未知章节保留原文', () => {
  const parsed = parseResumeText('父亲姓名：张父\n紧急联系人电话：13812345678\n教育经历\n学校：甲大学\n专业：计算机科学\n技能证书\n驾驶证：C1\n推荐人\n邮箱：referee@example.com');
  assert.equal(parsed.profile.basic.name, '');
  assert.equal(parsed.profile.basic.phone, '');
  assert.equal(parsed.profile.basic.email, '');
  assert.equal(parsed.profile.education[0].description, '');
  assert.match(parsed.profile.rawText, /驾驶证/);
});

test('无标签三列公司岗位日期及跨页实习小节合并为一条经历', () => {
  const parsed = parseResumeText('李小明\nAI产品经理\n状态：在职 2004/03\n邮箱：sample@example.com 电话：13812345678\n居住地：江苏省南京市 学历：双一流本科\n实习经历\n示例智能科技股份有限公司\tAI产品经理\t2025/05 - 至今\nVoiceAgent产品化与多行业接入\n负责产品方案设计与内部需求评审。\n平台内部上线与多行业Agent交付\n将客户流程转为可执行的配置。\n\n业务效果优化与数据复盘\n参与效果复盘并整理改进建议。\n教育经历\n示例理工大学｜数据科学与大数据技术 · 本科｜2022/09 - 2026/06\n主修课程：数据库、Python、数据结构。\n比赛经历\n2025.7 示例创新大赛：完成数据分析。');
  assert.equal(parsed.profile.basic.name, '李小明');
  assert.equal(parsed.profile.basic.highestEducation, '双一流本科');
  assert.equal(parsed.profile.basic.birthDate, '');
  assert.equal(parsed.profile.experience.length, 1);
  assert.equal(parsed.profile.experience[0].company, '示例智能科技股份有限公司');
  assert.equal(parsed.profile.experience[0].role, 'AI产品经理');
  assert.equal(parsed.profile.experience[0].startDate, '2025-05');
  assert.equal(parsed.profile.experience[0].endDate, '至今');
  assert.match(parsed.profile.experience[0].description, /业务效果优化与数据复盘/);
  assert.equal(parsed.profile.projects.length, 0);
  assert.equal(parsed.profile.education.length, 1);
  assert.equal(parsed.profile.education[0].school, '示例理工大学');
  assert.equal(parsed.profile.education[0].major, '数据科学与大数据技术');
  assert.equal(parsed.profile.education[0].educationLevel, '本科');
  assert.equal(parsed.profile.education[0].degree, '');
  assert.equal(parsed.profile.education[0].startDate, '2022-09');
  assert.equal(parsed.profile.education[0].endDate, '2026-06');
  assert.doesNotMatch(parsed.profile.education[0].description, /创新大赛/);
});

test('项目章节企业岗位上下文只共享公司角色，项目各自日期且不制造额外实习', () => {
  const parsed = parseResumeText('项目经历\n示例数据科技发展有限责任公司 数据分析师 2024/05 - 2025/04\n【员工试题项目 | 2024.5 - 2024.7】\n整理题目并校验数据。\n【招聘数据处理项目 | 2024.9 - 2024.11】\n清洗招聘数据并绘制图表。\n【创业就业指标项目 | 2024.11 - 2024.12】\n分析政策并建立评价指标。\n【数字人才研究报告 | 2025.3 - 2025.4】\n输出研究报告。');
  assert.equal(parsed.profile.experience.length, 0);
  assert.equal(parsed.profile.projects.length, 4);
  assert.deepEqual(parsed.profile.projects.map(project => [project.name, project.startDate, project.endDate]), [
    ['员工试题项目', '2024-05', '2024-07'], ['招聘数据处理项目', '2024-09', '2024-11'],
    ['创业就业指标项目', '2024-11', '2024-12'], ['数字人才研究报告', '2025-03', '2025-04']
  ]);
  assert.ok(parsed.profile.projects.every(project => project.company === '示例数据科技发展有限责任公司' && project.role === '数据分析师'));
  assert.equal(parsed.profile.projects[0].description, '整理题目并校验数据。');
  assert.ok(buildCandidates(parsed.profile).some(candidate => candidate.key === 'projects.0.company'));
});

test('无标签跨行公司岗位日期和学校专业学历可拆分，多条实习互不串段', () => {
  const parsed = parseResumeText('实习经历\n示例软件有限公司\n开发实习生\n2023.6—2023.8\n负责页面开发。\n另一示例科技有限公司 产品助理\n2024/03 - 2024/06\n负责调研访谈。\n教育背景\n示例大学\n软件工程 本科 2020/09 - 2024/06\n学士\n主修课程：数据结构。');
  assert.equal(parsed.profile.experience.length, 2);
  assert.equal(parsed.profile.experience[0].role, '开发实习生');
  assert.equal(parsed.profile.experience[0].endDate, '2023-08');
  assert.equal(parsed.profile.experience[1].company, '另一示例科技有限公司');
  assert.equal(parsed.profile.experience[1].role, '产品助理');
  assert.equal(parsed.profile.experience[1].startDate, '2024-03');
  assert.equal(parsed.profile.education[0].major, '软件工程');
  assert.equal(parsed.profile.education[0].educationLevel, '本科');
  assert.equal(parsed.profile.education[0].degree, '学士');
});

test('项目没有写角色和日期时保持空，项目子标题不另建项目', () => {
  const parsed = parseResumeText('项目经历\n【校园报名系统】\n【项目背景】\n学校需要一套报名工具。\n【个人贡献】\n完成报名页面。\n【课程管理平台】\n实现课程管理。');
  assert.equal(parsed.profile.projects.length, 2);
  assert.equal(parsed.profile.projects[0].name, '校园报名系统');
  assert.equal(parsed.profile.projects[0].role, '');
  assert.equal(parsed.profile.projects[0].startDate, '');
  assert.equal(parsed.profile.projects[0].endDate, '');
  assert.match(parsed.profile.projects[0].description, /个人贡献/);
});

test('独立项目标题与跨行日期可识别，简历头部姓名需要岗位和联系方式共同约束', () => {
  const parsed = parseResumeText('项目经历\n校园课程管理平台\n2024/05 - 2024/08\n实现课程维护功能。\n智能知识检索工具\n2024/09 至今\n完成检索功能。\n教育经历\n示例大学\n软件工程\n本科\n2020.09-2024.06');
  assert.equal(parsed.profile.projects.length, 2);
  assert.equal(parsed.profile.projects[0].name, '校园课程管理平台');
  assert.equal(parsed.profile.projects[0].startDate, '2024-05');
  assert.equal(parsed.profile.projects[1].endDate, '至今');
  assert.equal(parsed.profile.education[0].major, '软件工程');
  assert.equal(parsed.profile.education[0].educationLevel, '本科');
  assert.equal(parsed.profile.education[0].degree, '');
  assert.equal(parseResumeText('李小明\n邮箱：sample@example.com').profile.basic.name, '');
  assert.equal(parseResumeText('产品经理\nAI产品经理\n邮箱：sample@example.com').profile.basic.name, '');
});

test('现居地、籍贯、最高学历和最高学位保持区分', () => {
  const candidates = buildCandidates(sampleProfile());
  assert.equal(suggestForField({ label: '现居城市' }, candidates).value, '上海');
  assert.equal(suggestForField({ label: '籍贯' }, candidates).value, '杭州');
  assert.equal(suggestForField({ label: '最高学历' }, candidates).value, '本科');
  assert.equal(suggestForField({ label: '最高学位' }, candidates).value, '学士');
  assert.equal(suggestForField({ label: '户籍所在地' }, candidates).confidence, 'none');
});

test('多段经历无上下文时不猜，编号与学校名可消歧', () => {
  const candidates = buildCandidates(sampleProfile());
  assert.equal(suggestForField({ label: '学校名称', section: '教育经历' }, candidates).confidence, 'none');
  assert.equal(suggestForField({ label: '专业', section: '教育经历 2' }, candidates).value, '软件工程');
  assert.equal(suggestForField({ label: '入学时间', section: '第二段教育经历' }, candidates).value, '2024-09');
  assert.equal(suggestForField({ label: '毕业时间', section: '甲大学教育经历' }, candidates).value, '2024-06');
  assert.equal(suggestForField({ label: '学校', section: '教育经历 3' }, candidates).confidence, 'none');
});

test('通用起止时间和职位依赖所属经历，未知问题不猜', () => {
  const candidates = buildCandidates(sampleProfile());
  assert.equal(suggestForField({ label: '开始时间' }, candidates).confidence, 'none');
  assert.equal(suggestForField({ label: '开始时间', section: '项目经历' }, candidates).value, '2024-03');
  assert.equal(suggestForField({ label: '结束时间', section: '工作经历' }, candidates).value, '2025-09');
  assert.equal(suggestForField({ label: '职位', section: '项目经历' }, candidates).value, '前端开发');
  assert.equal(suggestForField({ label: '父亲姓名' }, candidates).confidence, 'none');
  assert.equal(suggestForField({ label: '为什么加入我们' }, candidates).confidence, 'none');
  assert.equal(suggestForField({ label: '备用邮箱', type: 'email' }, candidates).confidence, 'none');
  assert.equal(suggestForField({ label: '姓名', section: '紧急联系人' }, candidates).confidence, 'none');
  assert.equal(suggestForField({ label: 'Email', section: 'References' }, candidates).confidence, 'none');
  assert.equal(suggestForField({ label: 'Phone', section: 'Work experience' }, candidates).confidence, 'none');
});

test('原生日期控件不得虚构日，选项不匹配时不自动勾选', () => {
  const candidates = buildCandidates(sampleProfile());
  assert.equal(suggestForField({ label: '毕业时间', section: '教育经历 2', type: 'month' }, candidates).value, '2027-06');
  assert.equal(suggestForField({ label: '毕业时间', section: '教育经历 2', type: 'date' }, candidates).confidence, 'none');
  assert.equal(suggestForField({ label: '最高学历', kind: 'select', options: [{ label: '大学本科', value: 'bachelor' }] }, candidates).confidence, 'medium');
  assert.equal(suggestForField({ label: '最高学历', kind: 'select', options: [{ label: '本科', value: 'bachelor' }] }, candidates).value, '本科');
  assert.equal(suggestForField({ label: 'Email address (required)' }, candidates).value, 'zhang@example.com');
  assert.equal(suggestForField({ label: '现居城市', kind: 'custom-select' }, candidates).confidence, 'medium');
  const invalidProfile = sampleProfile();
  invalidProfile.basic.birthDate = '2023-02-31';
  assert.equal(suggestForField({ label: '出生日期', type: 'date' }, buildCandidates(invalidProfile)).confidence, 'none');
});

test('错误录入的学历不能写入学位，声明与勾选项需手动处理', () => {
  const profile = sampleProfile();
  profile.education[0].degree = '本科';
  profile.custom.push({ label: '同意隐私声明', value: '是' });
  const candidates = buildCandidates(profile);
  assert.equal(suggestForField({ label: '学位', section: '教育经历 1' }, candidates).confidence, 'none');
  assert.equal(suggestForField({ label: '同意隐私声明', kind: 'checkbox' }, candidates).confidence, 'none');
});

test('自定义字段严格按标签匹配，重复同名资料不猜', () => {
  const profile = sampleProfile();
  profile.custom.push({ label: '英语等级', value: 'CET-6' });
  assert.equal(suggestForField({ label: '英语等级' }, buildCandidates(profile)).value, 'CET-6');
  profile.custom.push({ label: '英语等级', value: 'CET-4' });
  assert.equal(suggestForField({ label: '英语等级' }, buildCandidates(profile)).confidence, 'none');
});

test('资料导入限制类型、版本、长度与原型，忽略额外键', () => {
  assert.throws(() => normalizeProfile(null), TypeError);
  assert.throws(() => normalizeProfile({ basic: [] }), TypeError);
  assert.throws(() => normalizeProfile({ version: 2 }), TypeError);
  assert.throws(() => normalizeProfile({ basic: { name: {} } }), TypeError);
  assert.throws(() => normalizeProfile({ education: [{}].concat(Array.from({ length: 30 }, () => ({}))) }), RangeError);
  assert.throws(() => normalizeProfile(Object.create({ basic: { name: '继承姓名' } })), TypeError);
  assert.throws(() => normalizeProfile({ rawText: 'x'.repeat(250001) }), RangeError);
  const normalized = normalizeProfile(JSON.parse('{"basic":{"name":"张三","__proto__":{"polluted":true}},"__proto__":{"polluted":true},"unknown":"ignored"}'));
  assert.equal(normalized.basic.name, '张三');
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(normalized, 'unknown'), false);
  assert.equal(Object.hasOwn(normalized.basic, '__proto__'), false);
});
