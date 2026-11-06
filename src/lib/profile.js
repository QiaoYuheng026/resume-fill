export const PROFILE_FIELDS = [
  { key: 'basic.name', label: '姓名', group: 'basic', aliases: ['姓名', '中文姓名', '真实姓名', '全名', 'name', 'full name', 'legal name'] },
  { key: 'basic.phone', label: '手机号码', group: 'basic', aliases: ['手机', '手机号', '手机号码', '联系电话', '联系方式', '电话', 'phone', 'mobile', 'mobile number', 'phone number', 'telephone'] },
  { key: 'basic.email', label: '电子邮箱', group: 'basic', aliases: ['邮箱', '电子邮箱', '电子邮件', '邮件地址', 'email', 'e-mail', 'email address'] },
  { key: 'basic.gender', label: '性别', group: 'basic', aliases: ['性别', 'gender', 'sex'] },
  { key: 'basic.birthDate', label: '出生日期', group: 'basic', aliases: ['出生日期', '出生年月', '生日', 'birth date', 'date of birth', 'birthday'] },
  { key: 'basic.city', label: '现居城市', group: 'basic', aliases: ['现居城市', '现居住地', '现居地', '居住城市', '居住地', '当前城市', 'current city', 'city of residence', 'current location'] },
  { key: 'basic.hometown', label: '籍贯', group: 'basic', aliases: ['籍贯', 'native place', 'ancestral home'] },
  { key: 'basic.politicalStatus', label: '政治面貌', group: 'basic', aliases: ['政治面貌', '政治身份', 'political status', 'political affiliation'] },
  { key: 'basic.highestEducation', label: '最高学历', group: 'basic', aliases: ['最高学历', '最高教育程度', 'highest education', 'highest education level'] },
  { key: 'basic.degree', label: '最高学位', group: 'basic', aliases: ['最高学位', '最高获得学位', 'highest degree'] },
  { key: 'basic.website', label: '个人主页', group: 'basic', aliases: ['个人主页', '个人网站', '作品集链接', '个人链接', 'website', 'personal website', 'portfolio url', 'portfolio link', 'github'] },
  { key: 'basic.jobIntent', label: '求职意向', group: 'basic', aliases: ['求职意向', '意向岗位', '意向职位', '期望职位', '应聘职位', '应聘岗位', 'desired position', 'job preference', 'position applied for'] },
  { key: 'basic.summary', label: '个人简介', group: 'basic', aliases: ['个人简介', '自我介绍', '自我评价', '个人总结', 'summary', 'personal summary', 'about me', 'profile summary'] },
  { key: 'education.school', label: '学校名称', group: 'education', aliases: ['学校', '学校名称', '毕业院校', '就读院校', '院校名称', '院校', 'school', 'school name', 'university', 'university name', 'institution'] },
  { key: 'education.major', label: '专业', group: 'education', aliases: ['专业', '专业名称', '所学专业', 'major', 'field of study', 'specialization'] },
  { key: 'education.educationLevel', label: '学历', group: 'education', aliases: ['学历', '教育程度', '学历层次', 'education level', 'level of education'] },
  { key: 'education.degree', label: '学位', group: 'education', aliases: ['学位', '所获学位', 'degree', 'academic degree'] },
  { key: 'education.startDate', label: '入学时间', group: 'education', aliases: ['入学时间', '入学日期', '开始时间', '开始日期', '起始时间', '起始日期', 'start date', 'start time', 'enrollment date', 'from'] },
  { key: 'education.endDate', label: '毕业时间', group: 'education', aliases: ['毕业时间', '毕业日期', '预计毕业时间', '预计毕业日期', '结束时间', '结束日期', 'end date', 'end time', 'graduation date', 'expected graduation date', 'to'] },
  { key: 'education.gpa', label: 'GPA / 成绩', group: 'education', aliases: ['gpa', '成绩', '平均绩点', '绩点', 'grade point average', '学业成绩'] },
  { key: 'education.description', label: '教育经历描述', group: 'education', aliases: ['教育经历描述', '在校经历', '在校表现', '教育描述', '描述', '补充说明', 'description', 'details', 'education description'] },
  { key: 'experience.company', label: '公司名称', group: 'experience', aliases: ['公司', '公司名称', '企业名称', '单位名称', '工作单位', '实习单位', 'company', 'company name', 'employer', 'organization'] },
  { key: 'experience.role', label: '职位', group: 'experience', aliases: ['职位', '职务', '岗位', '实习岗位', '职位名称', '岗位名称', 'position', 'job title', 'title', 'role'] },
  { key: 'experience.startDate', label: '开始时间', group: 'experience', aliases: ['开始时间', '开始日期', '起始时间', '入职时间', '入职日期', 'start date', 'start time', 'from'] },
  { key: 'experience.endDate', label: '结束时间', group: 'experience', aliases: ['结束时间', '结束日期', '离职时间', '离职日期', 'end date', 'end time', 'to'] },
  { key: 'experience.description', label: '工作 / 实习内容', group: 'experience', aliases: ['工作内容', '实习内容', '工作描述', '职责描述', '工作职责', '实习描述', '经历描述', '描述', '补充说明', 'description', 'responsibilities', 'job description', 'details'] },
  { key: 'projects.name', label: '项目名称', group: 'projects', aliases: ['项目名称', '项目', 'project name', 'project title', 'project'] },
  { key: 'projects.company', label: '项目所属单位', group: 'projects', aliases: ['项目所属单位', '项目公司', '所属公司', '所属单位', '项目所属公司', 'project company', 'project organization'] },
  { key: 'projects.role', label: '项目角色', group: 'projects', aliases: ['项目角色', '担任角色', '项目职责', '担任职务', '角色', '职位', '职务', 'role', 'position', 'project role'] },
  { key: 'projects.startDate', label: '开始时间', group: 'projects', aliases: ['开始时间', '开始日期', '起始时间', 'start date', 'start time', 'from'] },
  { key: 'projects.endDate', label: '结束时间', group: 'projects', aliases: ['结束时间', '结束日期', 'end date', 'end time', 'to'] },
  { key: 'projects.description', label: '项目描述', group: 'projects', aliases: ['项目描述', '项目内容', '项目介绍', '项目成果', '描述', '补充说明', 'description', 'project description', 'details'] }
];

const GROUP_LABELS = { basic: '基本信息', education: '教育经历', experience: '工作 / 实习经历', projects: '项目经历', custom: '自定义资料' };
const ENTRY_FIELDS = {
  education: ['school', 'major', 'educationLevel', 'degree', 'startDate', 'endDate', 'gpa', 'description'],
  experience: ['company', 'role', 'startDate', 'endDate', 'description'],
  projects: ['name', 'company', 'role', 'startDate', 'endDate', 'description']
};
const IDENTITY_FIELDS = { education: 'school', experience: 'company', projects: 'name' };
const MAX_TEXT_LENGTH = 250000;

export function emptyProfile() {
  return {
    version: 1,
    basic: {
      name: '', phone: '', email: '', gender: '', birthDate: '', city: '', hometown: '',
      politicalStatus: '', highestEducation: '', degree: '', website: '', jobIntent: '', summary: ''
    },
    education: [], experience: [], projects: [], custom: [], rawText: ''
  };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function safeText(value, limit, label) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value))) {
    throw new TypeError(`${label} 必须是文本。`);
  }
  const result = String(value).replace(/\u0000/g, '').trim();
  if (result.length > limit) throw new RangeError(`${label} 过长，最多允许 ${limit} 个字符。`);
  return result;
}

export function normalizeProfile(input) {
  if (!isRecord(input)) throw new TypeError('资料必须是 JSON 对象。');
  if (input.version !== undefined && input.version !== 1) throw new TypeError('暂不支持此资料版本。');
  const profile = emptyProfile();
  if (input.basic !== undefined && !isRecord(input.basic)) throw new TypeError('基本信息格式不正确。');
  for (const field of Object.keys(profile.basic)) {
    profile.basic[field] = safeText(input.basic?.[field], field === 'summary' ? 12000 : 1000, field);
  }
  for (const group of Object.keys(ENTRY_FIELDS)) {
    const entries = input[group] ?? [];
    if (!Array.isArray(entries)) throw new TypeError(`${GROUP_LABELS[group]} 必须是数组。`);
    if (entries.length > 30) throw new RangeError(`${GROUP_LABELS[group]} 最多允许 30 条。`);
    profile[group] = entries.map((entry, index) => {
      if (!isRecord(entry)) throw new TypeError(`${GROUP_LABELS[group]}第 ${index + 1} 条格式不正确。`);
      return Object.fromEntries(ENTRY_FIELDS[group].map(field => [field,
        safeText(entry[field], field === 'description' ? 20000 : 1000, `${GROUP_LABELS[group]} ${field}`)
      ]));
    });
  }
  if (input.custom !== undefined && !Array.isArray(input.custom)) throw new TypeError('自定义资料必须是数组。');
  if ((input.custom?.length ?? 0) > 100) throw new RangeError('自定义资料最多允许 100 条。');
  profile.custom = (input.custom ?? []).map(entry => {
    if (!isRecord(entry)) throw new TypeError('自定义资料格式不正确。');
    return { label: safeText(entry.label, 100, '自定义资料名称'), value: safeText(entry.value, 20000, '自定义资料内容') };
  });
  profile.rawText = safeText(input.rawText, MAX_TEXT_LENGTH, '简历原文');
  return profile;
}

function normalizedLabel(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/\([^)]*(?:必填|选填|required|optional)[^)]*\)/g, '')
    .replace(/^(?:您的|本人|个人的|申请人的|应聘者的|请输入|请选择)\s*/g, '')
    .replace(/(?:必填|选填|required|optional)$/g, '')
    .replace(/[\s*＊:：_\-\/.,，。()（）\[\]【】]/g, '');
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assignmentsFor(line, definitions) {
  const aliases = definitions.flatMap(definition => definition.aliases.map(alias => ({ alias, definition })))
    .sort((left, right) => right.alias.length - left.alias.length);
  const matcher = new RegExp(`(?:^|[\\s|｜;；,，•·])(${aliases.map(item => escapePattern(item.alias)).join('|')})\\s*[:：]\\s*`, 'gi');
  const matches = Array.from(line.matchAll(matcher));
  return matches.map((match, index) => {
    const definition = aliases.find(item => item.alias.toLowerCase() === match[1].toLowerCase()).definition;
    const nextIndex = matches[index + 1]?.index ?? line.length;
    return {
      key: definition.key.split('.').at(-1),
      value: line.slice(match.index + match[0].length, nextIndex).replace(/^[|｜;；,，\s]+|[|｜;；,，\s]+$/g, '').trim()
    };
  }).filter(item => item.value);
}

function dateText(value) {
  const text = value.trim();
  const match = text.match(/^(\d{4})\s*[年./-]\s*(\d{1,2})(?:\s*[月./-]\s*(\d{1,2})\s*日?)?\s*月?$/);
  if (!match) return text;
  const month = Number(match[2]);
  const day = match[3] ? Number(match[3]) : null;
  if (month < 1 || month > 12 || (day !== null && (day < 1 || day > new Date(Number(match[1]), month, 0).getDate()))) return text;
  return `${match[1]}-${String(month).padStart(2, '0')}${day === null ? '' : `-${String(day).padStart(2, '0')}`}`;
}

function sectionOf(line) {
  const title = line.replace(/^\s*[#\d.、一二三四五六七八九十()（）\-]+\s*/, '').replace(/[:：\s]+$/, '').trim();
  if (/^(教育(?:经历|背景)|学习经历|education(?:al background)?)$/i.test(title)) return 'education';
  if (/^(?:(?:工作|实习|实践)(?:经历|经验)|工作[\/／与和及、]实习经历|(?:work|professional|internship) experience|employment)$/i.test(title)) return 'experience';
  if (/^(项目(?:经历|经验)|projects?|project experience)$/i.test(title)) return 'projects';
  if (/^(个人简介|自我介绍|自我评价|个人总结|summary|about me|profile summary)$/i.test(title)) return 'summary';
  if (/^(基本信息|个人信息|联系方式|personal information|contact(?: information)?)$/i.test(title)) return 'basic';
  if (/^(专业技能|技能(?:证书|特长)?|证书|荣誉(?:奖项)?|获奖(?:经历|情况)?|比赛(?:经历|经验|情况)|竞赛(?:经历|经验|情况)|校园经历|社团经历|兴趣爱好|推荐人|紧急联系人|家庭成员|skills?|certifications?|awards?|competitions?|references?|emergency contacts?)$/i.test(title)) return 'unmapped';
  return '';
}

const DATE_FRAGMENT = '(?:19|20)\\d{2}(?:\\s*[年./-]\\s*\\d{1,2}(?:\\s*[月./-]\\s*\\d{1,2}\\s*日?)?\\s*月?)?';
const RANGE_PATTERN = new RegExp(`(?<!\\d)(${DATE_FRAGMENT})\\s*(?:[-—–~～至到]|to|(?=至今|现在|目前|present|current|now))\\s*(${DATE_FRAGMENT}|至今|现在|目前|present|current|now)(?!\\d)`, 'i');
const COMPANY_PATTERN = /^(.{2,65}?(?:有限责任公司|股份有限公司|有限公司|公司|集团|事务所|研究院|(?:\s|^)Inc\.?|(?:\s|^)LLC|(?:\s|^)Ltd\.?))(?=$|[\s|｜·•,，])/i;
const SCHOOL_PATTERN = /^(.{1,65}?(?:大学|学院|中学|高中|学校|University|College))(?=$|[\s|｜·•,，])/i;

function compactHeader(text) {
  return text.replace(/^[\s|｜·•【\[（(]+|[\s|｜·•】\]）)]+$/g, '').trim();
}

function roleText(text) {
  const value = compactHeader(text);
  return value.length > 0 && value.length <= 55 && !/[。；;！!：:]/.test(value)
    && !/^(负责|参与|面向|围绕|通过|使用|设计|搭建|实现|开发了|项目背景|工作内容|主要职责|项目职责)/.test(value)
    && /(?:经理|工程师|实习生|助理|主管|专员|负责人|设计师|分析师|研究员|顾问|运营|开发|manager|engineer|analyst|intern|designer|developer|researcher|consultant|specialist)$/i.test(value);
}

function rangeForLine(line) {
  const match = line.match(RANGE_PATTERN);
  if (!match) return { remaining: line, fields: {} };
  return {
    remaining: `${line.slice(0, match.index)} ${line.slice(match.index + match[0].length)}`.trim(),
    fields: { startDate: dateText(match[1]), endDate: dateText(match[2]) }
  };
}

function educationAttributes(text) {
  let remainder = compactHeader(text);
  const fields = {};
  const education = remainder.match(/(?:全日制)?(?:双一流)?(?:大学)?本科|硕士研究生|博士研究生|研究生|专科|大专|中专|高中/);
  if (education) { fields.educationLevel = education[0]; remainder = remainder.replace(education[0], ' '); }
  const degree = remainder.match(/(?:[\p{Script=Han}]{1,7})?(?:学士|硕士|博士)|(?:Bachelor|Master|Doctor)(?:'s)?(?:\s+of\s+[A-Za-z ]+)?/iu);
  if (degree) { fields.degree = degree[0].trim(); remainder = remainder.replace(degree[0], ' '); }
  const major = compactHeader(remainder).replace(/^[,，]+|[,，]+$/g, '').trim();
  if (major && major.length <= 65 && !/[：:]/.test(major)) fields.major = major;
  return fields;
}

function lineHeader(group, line) {
  const cleanLine = line.trim();
  if (!cleanLine || cleanLine.length > 170 || /[。；;！!]/.test(cleanLine)
    || /^(负责|参与|面向|围绕|通过|使用|设计|搭建|实现|主修课程|校园经历|工作内容|项目背景|项目描述|项目内容|项目成果|职责描述|个人贡献)[：:\s]/.test(cleanLine)) return null;
  const range = rangeForLine(cleanLine);
  const remaining = compactHeader(range.remaining);
  if (!remaining && Object.keys(range.fields).length) return { kind: 'attributes', fields: range.fields };
  const company = remaining.match(COMPANY_PATTERN);
  if (company && group !== 'education') {
    const role = compactHeader(remaining.slice(company[0].length));
    if (role && !roleText(role)) return null;
    return { kind: group === 'projects' ? 'context' : 'entry', fields: { company: company[1].trim(), ...(role ? { role } : {}), ...range.fields } };
  }
  if (group === 'education') {
    const school = remaining.match(SCHOOL_PATTERN);
    if (school) {
      const fields = { school: school[1].trim(), ...educationAttributes(remaining.slice(school[0].length)), ...range.fields };
      return { kind: 'entry', fields };
    }
    const qualification = remaining.match(/^(本科|专科|大专|中专|高中|硕士研究生|博士研究生|研究生|(?:\p{Script=Han}{1,7})?(?:学士|硕士|博士))$/u);
    if (qualification) return { kind: 'attributes', fields: { [qualificationKind(qualification[0]) === 'education' ? 'educationLevel' : 'degree']: qualification[0], ...range.fields } };
    if (Object.keys(range.fields).length && remaining.length <= 65 && !/[：:]/.test(remaining)) {
      return { kind: 'attributes', fields: { ...educationAttributes(remaining), ...range.fields } };
    }
    if (remaining.length <= 40 && /(?:专业|科学|技术|工程|管理|经济学|金融学|统计学|数学|物理学|化学|心理学)$/.test(remaining)) {
      return { kind: 'attributes', fields: { major: remaining } };
    }
    return null;
  }
  if (roleText(remaining)) return { kind: 'attributes', fields: { role: remaining, ...range.fields } };
  if (group !== 'projects') return null;
  const bracketed = /^[【\[].+[】\]]$/.test(cleanLine);
  const subsection = /^(?:项目)?(?:背景|职责|成果|介绍|描述|目标|内容|任务|成效|技术栈|工具|方案|实践|亮点|个人贡献|负责内容|难点|解决方案)$/;
  const title = remaining.replace(/^\d+[.、)）]\s*/, '').trim();
  if (!title || title.length > 110 || subsection.test(title) || /[:：。！？!?]/.test(title)
    || /^(负责|参与|面向|围绕|通过|使用|设计|搭建|实现|完成|支持|针对|为支持|结合|基于)/.test(title)) return null;
  if (bracketed || Object.keys(range.fields).length || /(?:平台|系统|工具|应用|项目|报告|App|APP|Demo|Portal|Platform|System|Project)$/i.test(title)) {
    return { kind: 'entry', fields: { name: title, ...range.fields } };
  }
  return null;
}

export function parseResumeText(text) {
  const rawText = safeText(text, MAX_TEXT_LENGTH, '简历原文');
  const profile = emptyProfile();
  profile.rawText = rawText;
  if (!rawText) return { profile, warnings: ['尚未读取到文字，请粘贴简历内容或选择可提取文字的文件。'] };
  const warnings = ['这是本地规则提取结果，请先校对资料，未明确提供的内容不会推测。'];
  const lines = rawText.replace(/\r\n?/g, '\n').split('\n').map(line => line.trim());
  const basicDefinitions = PROFILE_FIELDS.filter(field => field.group === 'basic').map(field => field.key === 'basic.highestEducation' ? { ...field, aliases: [...field.aliases, '学历'] } : field);
  let section = 'basic';
  let entry = null;
  let projectContext = {};
  const contactLines = [];
  const finishEntry = () => {
    if (entry && Object.values(entry).some(Boolean)) {
      if (profile[section].length >= 30) throw new RangeError(`${GROUP_LABELS[section]} 超过 30 条，请分批整理。`);
      profile[section].push(entry);
    }
    entry = null;
  };
  for (const line of lines) {
    if (!line) continue;
    const heading = sectionOf(line);
    if (heading) {
      if (ENTRY_FIELDS[section]) finishEntry();
      section = heading;
      projectContext = {};
      continue;
    }
    if (section === 'basic') {
      if (/紧急联系人|推荐人|父亲|母亲|配偶|家属|emergency contact|referee|reference contact/i.test(line)) continue;
      contactLines.push(line);
      for (const assignment of assignmentsFor(line, basicDefinitions)) {
        if (!profile.basic[assignment.key]) profile.basic[assignment.key] = assignment.key === 'birthDate' ? dateText(assignment.value) : assignment.value;
      }
      continue;
    }
    if (section === 'unmapped') continue;
    if (section === 'summary') {
      profile.basic.summary += `${profile.basic.summary ? '\n' : ''}${line}`;
      continue;
    }
    const definitions = PROFILE_FIELDS.filter(field => field.group === section);
    const assignments = assignmentsFor(line, definitions);
    const identity = IDENTITY_FIELDS[section];
    if (!assignments.length) {
      const header = lineHeader(section, line);
      if (header?.kind === 'context') {
        finishEntry();
        projectContext = { company: header.fields.company || '', role: header.fields.role || '' };
        continue;
      }
      if (header?.kind === 'entry') {
        if (entry?.[identity]) finishEntry();
        if (!entry) entry = Object.fromEntries(ENTRY_FIELDS[section].map(field => [field, '']));
        if (section === 'projects') Object.assign(entry, projectContext);
        Object.assign(entry, header.fields);
        continue;
      }
      if (header?.kind === 'attributes') {
        if (section === 'projects' && !entry && projectContext.company) {
          if (header.fields.role) projectContext.role = header.fields.role;
          continue;
        }
        if (section !== 'projects' && entry?.description && Object.keys(header.fields).some(key => entry[key] && entry[key] !== header.fields[key])) finishEntry();
        if (!entry) entry = Object.fromEntries(ENTRY_FIELDS[section].map(field => [field, '']));
        Object.assign(entry, header.fields);
        continue;
      }
    }
    if (entry?.[identity] && assignments.some(assignment => assignment.key === identity)) finishEntry();
    if (!entry) entry = Object.fromEntries(ENTRY_FIELDS[section].map(field => [field, '']));
    if (assignments.length) {
      for (const assignment of assignments) {
        const value = /Date$/.test(assignment.key) ? dateText(assignment.value) : assignment.value;
        entry[assignment.key] = entry[assignment.key] && assignment.key === 'description' ? `${entry[assignment.key]}\n${value}` : value;
      }
    } else {
      entry.description += `${entry.description ? '\n' : ''}${line}`;
    }
  }
  if (ENTRY_FIELDS[section]) finishEntry();
  const contactText = contactLines.slice(0, 35).join('\n');
  if (!profile.basic.email) {
    const emails = [...new Set(contactText.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+/gi) ?? [])];
    if (emails.length === 1) profile.basic.email = emails[0];
    else if (emails.length > 1) warnings.push('发现多个邮箱，请选择本次求职使用的邮箱。');
  }
  if (!profile.basic.phone) {
    const phones = [...new Set(Array.from(contactText.matchAll(/(?<!\d)(?:\+?86[ -]?)?(1[3-9]\d{9})(?!\d)/g), match => match[0]))];
    if (phones.length === 1) profile.basic.phone = phones[0];
    else if (phones.length > 1) warnings.push('发现多个手机号码，请确认应使用的联系方式。');
  }
  if (!profile.basic.name) {
    const firstLine = contactLines[0]?.trim() || '';
    const nearbyContact = contactLines.slice(1, 9).some(line => /(?:邮箱|邮件|email|手机|电话|phone)\s*[:：]/i.test(line));
    const nearbyRole = contactLines.slice(1, 4).some(line => roleText(line));
    if (/^[\p{Script=Han}·]{2,8}$/u.test(firstLine) && !/简历|个人信息|基本信息|求职|应聘/.test(firstLine) && !roleText(firstLine) && nearbyContact && nearbyRole) profile.basic.name = firstLine;
  }
  if (!profile.basic.name) warnings.push('未找到明确的姓名，请补充姓名。');
  for (const group of Object.keys(ENTRY_FIELDS)) {
    if (profile[group].some(item => !item[IDENTITY_FIELDS[group]])) {
      warnings.push(`${GROUP_LABELS[group]}中有无法可靠拆分的文字，已保留到描述中，请补充名称并按实际经历拆分。`);
    }
  }
  if (!profile.education.length && !profile.experience.length && !profile.projects.length) warnings.push('未识别到标准经历分段。原文已保留，可手动补充教育、实习和项目。');
  return { profile: normalizeProfile(profile), warnings };
}

export function buildCandidates(input) {
  const profile = normalizeProfile(input);
  const candidates = [];
  for (const definition of PROFILE_FIELDS) {
    const [group, field] = definition.key.split('.');
    if (group === 'basic') {
      const value = profile.basic[field];
      if (value) candidates.push({ key: definition.key, label: `${GROUP_LABELS[group]} · ${definition.label}`, value, group });
      continue;
    }
    profile[group].forEach((entry, index) => {
      if (entry[field]) {
        const identity = entry[IDENTITY_FIELDS[group]];
        candidates.push({ key: `${group}.${index}.${field}`, label: `${GROUP_LABELS[group]} ${index + 1}${identity ? ` · ${identity}` : ''} · ${definition.label}`, value: entry[field], group });
      }
    });
  }
  profile.custom.forEach((entry, index) => {
    if (entry.label && entry.value) candidates.push({ key: `custom.${index}.value`, label: entry.label, value: entry.value, group: 'custom' });
  });
  return candidates;
}

function emptySuggestion(reason) {
  return { key: '', value: '', confidence: 'none', reason };
}

function contextGroup(text) {
  const groups = [];
  if (/(?:教育|院校|学历经历|education|academic)/i.test(text)) groups.push('education');
  if (/(?:实习|工作经历|工作经验|任职|employment|work experience|professional experience|internship)/i.test(text)) groups.push('experience');
  if (/(?:项目经历|项目经验|项目名称|project)/i.test(text)) groups.push('projects');
  if (/(?:基本信息|个人信息|联系方式|personal information|contact information)/i.test(text)) groups.push('basic');
  return groups.length === 1 ? groups[0] : '';
}

function contextEntryIndex(text, group) {
  const groupPatterns = { education: '(?:教育经历|教育背景|教育|education)', experience: '(?:工作经历|实习经历|工作经验|实习|工作|experience|employment)', projects: '(?:项目经历|项目经验|项目|project)' };
  const groupPattern = groupPatterns[group];
  if (!groupPattern) return null;
  const ordinal = text.match(/第\s*(\d+|[一二三四五六七八九十])\s*(?:段|条|项|次)?/);
  const numbered = text.match(new RegExp(`${groupPattern}\\s*(?:第|#|：|:)?\\s*(\\d+|[一二三四五六七八九十])(?:\\s|段|条|项|[：:·.、\\-]|$)`, 'i'));
  const token = ordinal?.[1] ?? numbered?.[1];
  if (!token) return null;
  const number = /^\d+$/.test(token) ? Number(token) : '一二三四五六七八九十'.indexOf(token) + 1;
  return number > 0 ? number - 1 : null;
}

function qualificationKind(value) {
  if (/本科|专科|大专|中专|高中|初中|研究生|学历/.test(value)) return 'education';
  if (/学士|硕士|博士|学位|bachelor|master|doctor|ph\.?d/i.test(value)) return 'degree';
  return '';
}

function sameOption(left, right) {
  return String(left).trim().normalize('NFKC').toLowerCase() === String(right).trim().normalize('NFKC').toLowerCase();
}

export function suggestForField(field, candidates) {
  if (!field || typeof field !== 'object' || !Array.isArray(candidates)) return emptySuggestion('字段或资料格式不正确。');
  const label = typeof field.label === 'string' ? field.label : '';
  const normalized = normalizedLabel(label);
  const section = typeof field.section === 'string' ? field.section : '';
  if (['checkbox', 'password', 'file', 'hidden'].includes(field.kind) || ['password', 'file', 'hidden', 'checkbox'].includes(field.type)
    || /同意|承诺|声明|授权|签名|consent|agree|declaration|signature/i.test(label)) {
    return emptySuggestion('此项需要本人确认或手动处理。');
  }
  if (!normalized && !['email', 'tel'].includes(field.type)) return emptySuggestion('网页没有明确的字段名称，请手动选择资料。');
  let definitions = PROFILE_FIELDS.filter(definition => definition.aliases.some(alias => normalizedLabel(alias) === normalized));
  let inferredByType = false;
  if (!definitions.length && !normalized && ['email', 'tel'].includes(field.type)) {
    definitions = PROFILE_FIELDS.filter(definition => definition.key === (field.type === 'email' ? 'basic.email' : 'basic.phone'));
    inferredByType = true;
  }
  const group = contextGroup(section) || contextGroup(label);
  if (/紧急联系人|推荐人|家庭成员|家属|父亲|母亲|配偶|emergency contact|references?|referee|guardian|spouse/i.test(section)) {
    return emptySuggestion('此区域可能要求其他人的信息，请手动选择对应资料。');
  }
  if (group && group !== 'basic' && definitions.some(definition => ['basic.name', 'basic.phone', 'basic.email'].includes(definition.key))) {
    return emptySuggestion('此区域并非基本信息，无法确认应填写本人的联系方式。');
  }
  if (group && definitions.some(definition => definition.group === group)) definitions = definitions.filter(definition => definition.group === group);
  let matches = candidates.filter(candidate => {
    if (!candidate || typeof candidate.key !== 'string' || typeof candidate.value !== 'string' || !candidate.value) return false;
    if (candidate.group === 'custom') return normalizedLabel(candidate.label) === normalized && Boolean(normalized);
    const parts = candidate.key.split('.');
    const definitionKey = parts.length === 3 ? `${parts[0]}.${parts[2]}` : candidate.key;
    return definitions.some(definition => definition.key === definitionKey);
  });
  if (!matches.length) return emptySuggestion('没有找到明确对应的已保存资料，请手动选择或补充。');
  const distinctGroups = [...new Set(matches.map(candidate => candidate.group))];
  if (distinctGroups.length > 1) return emptySuggestion('字段可能属于多种经历，请先选择对应的资料。');
  const matchedGroup = distinctGroups[0];
  const requestedIndex = contextEntryIndex(section, matchedGroup);
  if (requestedIndex !== null) {
    matches = matches.filter(candidate => Number(candidate.key.split('.')[1]) === requestedIndex);
    if (!matches.length) return emptySuggestion(`网页对应第 ${requestedIndex + 1} 段经历，资料中没有对应值。`);
  } else if (matches.length > 1 && IDENTITY_FIELDS[matchedGroup]) {
    const identityField = IDENTITY_FIELDS[matchedGroup];
    const matchingIdentities = candidates.filter(candidate => candidate.group === matchedGroup && candidate.key.endsWith(`.${identityField}`)
      && candidate.value.length > 1 && section.includes(candidate.value));
    if (matchingIdentities.length === 1) {
      const prefix = matchingIdentities[0].key.split('.').slice(0, 2).join('.');
      matches = matches.filter(candidate => candidate.key.startsWith(`${prefix}.`));
    }
  }
  if (matches.length !== 1) return emptySuggestion('有多条可能匹配的资料，请选择本次要填写的经历。');
  const candidate = matches[0];
  const candidateField = candidate.key.split('.').at(-1);
  const qualification = qualificationKind(candidate.value);
  if (candidateField === 'degree' && qualification === 'education') return emptySuggestion('资料保存的是学历，当前字段要求学位，请先校对。');
  if (['educationLevel', 'highestEducation'].includes(candidateField) && qualification === 'degree') return emptySuggestion('资料保存的是学位，当前字段要求学历，请先校对。');
  let value = candidate.value;
  let confidence = inferredByType ? 'medium' : 'high';
  let reason = inferredByType ? '按输入框类型推测，请确认字段用途。' : '字段名称与已确认资料明确匹配。';
  if (field.type === 'month' || field.type === 'date') {
    value = dateText(value);
    const expectedPattern = field.type === 'date' ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}$/;
    if (field.type === 'month' && /^\d{4}-\d{2}-\d{2}$/.test(value)) value = value.slice(0, 7);
    if (!expectedPattern.test(value)) return emptySuggestion(field.type === 'date' ? '网页要求完整年月日，资料中的日期精度不足或格式不符。' : '网页要求年月，资料中的日期格式不符。');
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1000 || month < 1 || month > 12 || (day !== undefined && (day < 1 || day > new Date(year, month, 0).getDate()))) {
      return emptySuggestion('资料中的日期不是有效日期，请先校对。');
    }
  }
  if (Array.isArray(field.options) && field.options.length) {
    const options = field.options.filter(option => option && !option.disabled && (sameOption(option.label, value) || sameOption(option.value, value)));
    if (options.length === 1) value = String(options[0].label || options[0].value);
    else {
      confidence = 'medium';
      reason = '已找到资料，但网页选项没有唯一精确匹配，请确认或复制后手动选择。';
    }
  }
  if (['combobox', 'custom', 'custom-select'].includes(field.kind)) {
    confidence = 'medium';
    reason = '这是自定义选择控件，请确认候选项，必要时复制后手动选择。';
  }
  return { key: candidate.key, value, confidence, reason };
}
