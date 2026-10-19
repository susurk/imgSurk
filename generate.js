const fs = require('fs');
const path = require('path');

const ROOT = '.';
const EXCLUDE = new Set([
  'node_modules', '.git', '.github', '.gitignore',
  'generate-index.js', 'index.html',
  'README.md', 'package.json', 'package-lock.json', 'LICENSE'
]);

function collectFiles(dir, basePath = '') {
  let files = [];
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return files; }
  for (const entry of entries) {
    if (EXCLUDE.has(entry) || entry.startsWith('.')) continue;
    const fullPath = path.join(dir, entry);
    const relPath = path.join(basePath, entry).replace(/\\/g, '/');
    let stat;
    try { stat = fs.statSync(fullPath); } catch { continue; }
    if (stat.isDirectory()) {
      files = files.concat(collectFiles(fullPath, relPath));
    } else {
      files.push({
        name: entry,
        relPath,
        url: '/' + relPath,
        dir: basePath || '/',
        size: stat.size,
        ext: path.extname(entry).toLowerCase().slice(1)
      });
    }
  }
  return files;
}

const files = collectFiles(ROOT);

const groups = new Map();
for (const f of files) {
  if (!groups.has(f.dir)) groups.set(f.dir, []);
  groups.get(f.dir).push(f);
}

const sortedDirs = [...groups.keys()].sort((a, b) => {
  if (a === '/') return -1;
  if (b === '/') return 1;
  return a.localeCompare(b);
});

for (const d of sortedDirs) {
  groups.get(d).sort((a, b) => a.name.localeCompare(b.name));
}

const totalFiles = files.length;
const totalSize = files.reduce((s, f) => s + f.size, 0);
const totalDirs = groups.size;

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function extColor(ext) {
  const map = {
    png: ['#7c3aed', '#ede9fe'], jpg: ['#7c3aed', '#ede9fe'], jpeg: ['#7c3aed', '#ede9fe'],
    gif: ['#7c3aed', '#ede9fe'], webp: ['#7c3aed', '#ede9fe'], svg: ['#7c3aed', '#ede9fe'],
    ico: ['#7c3aed', '#ede9fe'],
    js: ['#ca8a04', '#fef9c3'], mjs: ['#ca8a04', '#fef9c3'],
    json: ['#0891b2', '#cffafe'],
    css: ['#2563eb', '#dbeafe'],
    html: ['#ea580c', '#ffedd5'], htm: ['#ea580c', '#ffedd5'],
    md: ['#475569', '#e2e8f0'],
    txt: ['#475569', '#e2e8f0']
  };
  const c = map[ext] || ['#334155', '#cbd5e1'];
  return { bg: c[0], fg: c[1] };
}

function renderGroup(dir, items) {
  const label = dir === '/' ? '根目录' : dir;
  const groupSize = items.reduce((s, f) => s + f.size, 0);
  let html = `<section class="dir-group collapsed" data-dir="${esc(dir)}">
  <div class="dir-header">
    <div class="dir-title"><span class="chevron">▼</span>${esc(label)}</div>
    <div class="dir-count">${items.length} 个文件 · ${fmtSize(groupSize)}</div>
  </div>
  <ul>
`;
  for (const f of items) {
    const ext = f.ext || 'file';
    const color = extColor(ext);
    html += `    <li data-name="${esc(f.relPath.toLowerCase())}">
      <span class="ext-tag" style="background:${color.bg};color:${color.fg}">${esc((ext || '?').slice(0, 4))}</span>
      <a class="file-link" href="${f.url}" target="_blank" rel="noopener">${esc(f.name)}</a>
      <span class="file-size">${fmtSize(f.size)}</span>
    </li>\n`;
  }
  html += `  </ul>
</section>\n`;
  return html;
}

const groupsHtml = sortedDirs.map(d => renderGroup(d, groups.get(d))).join('');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>资源索引 · imgSurk</title>
<style>
  :root {
    --bg: #0f172a;
    --bg-card: #1e293b;
    --bg-header: #243244;
    --border: #334155;
    --text: #e2e8f0;
    --muted: #94a3b8;
    --accent: #38bdf8;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border);
    padding: 1rem;
  }
  .header-inner { max-width: 960px; margin: 0 auto; }
  h1 { font-size: 1.35rem; margin: 0 0 .5rem; }
  .stats {
    display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;
    font-size: .85rem; color: var(--muted); margin-bottom: .75rem;
  }
  .stats strong { color: var(--text); font-weight: 600; }
  .toggle-btn {
    margin-left: auto;
    padding: .35rem .7rem; border-radius: 6px;
    border: 1px solid var(--border); background: #0b1220;
    color: var(--text); font-size: .8rem; cursor: pointer;
  }
  .toggle-btn:hover { border-color: var(--accent); color: var(--accent); }
  .search {
    width: 100%; padding: .6rem .8rem;
    border-radius: 8px; border: 1px solid var(--border);
    background: #0b1220; color: var(--text);
    font-size: .95rem; outline: none;
  }
  .search:focus { border-color: var(--accent); }
  main { max-width: 960px; margin: 1.5rem auto 3rem; padding: 0 1rem; }
  .empty { text-align: center; color: var(--muted); padding: 2rem; display: none; }
  .dir-group {
    margin-bottom: 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    background: var(--bg-card);
  }
  .dir-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: .7rem 1rem; cursor: pointer; user-select: none;
    background: var(--bg-header);
  }
  .dir-header:hover { background: #2a3a50; }
  .dir-title {
    display: flex; align-items: center; gap: .5rem;
    font-weight: 600; font-size: .95rem; word-break: break-all;
  }
  .chevron { transition: transform .2s; font-size: .75rem; color: var(--muted); }
  .dir-group.collapsed .chevron { transform: rotate(-90deg); }
  .dir-group.collapsed ul { display: none; }
  .dir-count { font-size: .78rem; color: var(--muted); white-space: nowrap; }
  ul { list-style: none; margin: 0; padding: 0; }
  li {
    display: flex; align-items: center; gap: .75rem;
    padding: .55rem 1rem; border-top: 1px solid var(--border);
    font-size: .9rem;
  }
  li:hover { background: rgba(56, 189, 248, 0.05); }
  .ext-tag {
    flex-shrink: 0; font-size: .66rem; font-weight: 700;
    text-transform: uppercase; padding: .15rem .4rem;
    border-radius: 4px; min-width: 3rem; text-align: center;
  }
  .file-link {
    color: var(--accent); text-decoration: none;
    word-break: break-all; flex: 1;
  }
  .file-link:hover { text-decoration: underline; }
  .file-size { color: var(--muted); font-size: .78rem; white-space: nowrap; flex-shrink: 0; }
  @media (max-width: 600px) {
    .file-size { display: none; }
    li { padding: .55rem .75rem; }
    .toggle-btn { margin-left: 0; }
  }
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <h1>📁 资源索引</h1>
    <div class="stats">
      <span>共 <strong>${totalFiles}</strong> 个文件</span>
      <span><strong>${totalDirs}</strong> 个目录</span>
      <span>总计 <strong>${fmtSize(totalSize)}</strong></span>
      <button id="toggleAll" class="toggle-btn">全部展开</button>
    </div>
    <input id="search" class="search" type="search" placeholder="搜索文件名或路径..." autocomplete="off">
  </div>
</header>
<main>
  <div id="groups">
${groupsHtml}  </div>
  <div class="empty" id="empty">没有匹配的文件</div>
</main>
<script>
  document.querySelectorAll('.dir-header').forEach(function (h) {
    h.addEventListener('click', function () {
      h.parentElement.classList.toggle('collapsed');
      updateToggleText();
    });
  });

  var search = document.getElementById('search');
  var empty = document.getElementById('empty');
  var toggleBtn = document.getElementById('toggleAll');

  function updateToggleText() {
    var anyExpanded = document.querySelector('.dir-group:not(.collapsed)');
    toggleBtn.textContent = anyExpanded ? '全部折叠' : '全部展开';
  }

  toggleBtn.addEventListener('click', function () {
    var anyExpanded = document.querySelector('.dir-group:not(.collapsed)');
    document.querySelectorAll('.dir-group').forEach(function (g) {
      if (anyExpanded) {
        g.classList.add('collapsed');
      } else {
        g.classList.remove('collapsed');
      }
    });
    updateToggleText();
  });

  search.addEventListener('input', function () {
    var q = search.value.trim().toLowerCase();
    var anyVisible = false;

    document.querySelectorAll('.dir-group').forEach(function (group) {
      var visible = 0;
      group.querySelectorAll('li').forEach(function (li) {
        var match = !q || li.dataset.name.indexOf(q) !== -1;
        li.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      group.style.display = visible ? '' : 'none';
      if (visible) {
        anyVisible = true;
        if (q) {
          group.classList.remove('collapsed');
        } else {
          group.classList.add('collapsed');
        }
      }
    });

    empty.style.display = anyVisible ? 'none' : 'block';
    updateToggleText();
  });
</script>
</body>
</html>`;

fs.writeFileSync('index.html', html);
console.log('✅ 已生成 index.html，共 ' + totalFiles + ' 个文件，' + totalDirs + ' 个目录。');
