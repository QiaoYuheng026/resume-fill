# 第三方组件说明

网申轻填保留随第三方组件附带的许可证。下列组件均本地打包，不从 CDN 加载。

| 组件 | 用途 | 许可证及位置 |
| --- | --- | --- |
| PDF.js 5.6.205 | PDF 文字提取与本地 worker | Apache-2.0，`src/vendor/pdfjs/LICENSE` |
| JSZip | DOCX 文档读取 | MIT / GPLv3 双许可证，此项目按 MIT 条款使用；`src/vendor/JSZIP-LICENSE.markdown` |
| PDF.js 字体和字符映射资源 | 字体与 CJK 文本支持 | 对应许可证保留在 `src/vendor/pdfjs/standard_fonts/` 及 PDF.js 目录中 |

浏览器测试使用 Playwright、pdf-lib 和 JSZip，由开发者在本机按需安装，未把测试依赖打包进插件。
