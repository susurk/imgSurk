const fs = require('fs');
const path = require('path');

// 要扫描的根目录（当前目录）
const ROOT = '.';
// 需要排除的目录/文件（避免把脚本本身或隐藏文件也列出来）
const EXCLUDE = ['node_modules', '.git', '.github', 'generate-index.js', 'index.html', 'README.md'];

function buildTree(dir, basePath = '') {
  let items = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    if (EXCLUDE.includes(file)) continue;
    const fullPath = path.join(dir, file);
    const relPath = path.join(basePath, file).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 如果是目录，递归获取子项，但当前层级只显示目录链接
      items.push({ name: file + '/', type: 'dir', path: relPath });
      // 同时收集子文件（扁平化），以便后续生成完整列表
      // 为了简单，这里选择扁平列出所有文件，不展开目录
    } else {
      items.push({ name: file, type: 'file', path: relPath, size: stat.size });
    }
  }
  return items;
}

// 递归收集所有文件（扁平列表，方便直接点击）
function collectAllFiles(dir, basePath = '') {
  let files = [];
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (EXCLUDE.includes(entry)) continue;
    const fullPath = path.join(dir, entry);
    const relPath = path.join(basePath, entry).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(collectAllFiles(fullPath, relPath));
    } else {
      files.push({ name: relPath, size: stat.size, url: '/' + relPath });
    }
  }
  return files;
}

const allFiles = collectAllFiles(ROOT);

// 生成 HTML
let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>资源索引 · imgSurk</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; background: #0f172a; color: #e2e8f0; }
    h1 { border-bottom: 1px solid #334155; padding-bottom: .5rem; }
    ul { list-style: none; padding: 0; }
    li { padding: .4rem 0; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
    a { color: #38bdf8; text-decoration: none; word-break: break-all; }
    a:hover { text-decoration: underline; }
    .size { color: #94a3b8; font-size: .85rem; white-space: nowrap; margin-left: 1rem; }
    .count { color: #94a3b8; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>📁 资源索引</h1>
  <p class="count">共 ${allFiles.length} 个文件</p>
  <ul>
`;

for (const f of allFiles) {
  const sizeStr = f.size < 1024 ? f.size + ' B'
    : f.size < 1024 * 1024 ? (f.size / 1024).toFixed(1) + ' KB'
    : (f.size / 1024 / 1024).toFixed(1) + ' MB';
  html += `    <li><a href="${f.url}" target="_blank">${f.name}</a><span class="size">${sizeStr}</span></li>\n`;
}

html += `  </ul>
</body>
</html>`;

fs.writeFileSync('index.html', html);
console.log(`✅ 已生成 index.html，共 ${allFiles.length} 个文件。`);
