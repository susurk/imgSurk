const fs = require('fs');
const path = require('path');

const EXCLUDE = new Set(['node_modules', '.git', '.github', '.gitignore', 'generate-index.js', 'index.html', 'README.md', 'package.json', 'package-lock.json', 'LICENSE']);

const walk = (dir, base = '') => fs.readdirSync(dir).flatMap(entry => {
  if (EXCLUDE.has(entry) || entry.startsWith('.')) return [];
  const full = path.join(dir, entry);
  const rel = path.join(base, entry).replace(/\\/g, '/');
  const stat = fs.statSync(full);
  return stat.isDirectory()
    ? walk(full, rel)
    : [{ name: entry, rel, url: '/' + rel, dir: base || '/', size: stat.size, ext: path.extname(entry).toLowerCase().slice(1) }];
});

const files = walk('.');
const groups = new Map();
files.forEach(f => (groups.get(f.dir) || groups.set(f.dir, []).get(f.dir)).push(f));
const dirs = [...groups.keys()].sort((a, b) => a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b));
groups.forEach(g => g.sort((a, b) => a.name.localeCompare(b.name)));

const fmt = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : b < 1073741824 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1073741824).toFixed(1) + ' GB';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const COLORS = {
  png: ['#7c3aed', '#ede9fe'], jpg: ['#7c3aed', '#ede9fe'], jpeg: ['#7c3aed', '#ede9fe'],
  gif: ['#7c3aed', '#ede9fe'], webp: ['#7c3aed', '#ede9fe'], svg: ['#7c3aed', '#ede9fe'], ico: ['#7c3aed', '#ede9fe'],
  js: ['#ca8a04', '#fef9c3'], mjs: ['#ca8a04', '#fef9c3'],
  json: ['#0891b2', '#cffafe'],
  css: ['#2563eb', '#dbeafe'],
  html: ['#ea580c', '#ffedd5'], htm: ['#ea580c', '#ffedd5'],
  md: ['#475569', '#e2e8f0'], txt: ['#475569', '#e2e8f0']
};

const renderGroup = (dir, items) => {
  const size = items.reduce((s, f) => s + f.size, 0);
  const lis = items.map(f => {
    const [bg, fg] = COLORS[f.ext] || ['#334155', '#cbd5e1'];
    return `<li data-name="${esc(f.rel.toLowerCase())}"><span class="ext-tag" style="background:${bg};color:${fg}">${esc((f.ext || '?').slice(0, 4))}</span><a class="file-link" href="${f.url}" target="_blank" rel="noopener">${esc(f.name)}</a><span class="file-size">${fmt(f.size)}</span></li>`;
  }).join('');
  return `<section class="dir-group collapsed"><div class="dir-header"><div class="dir-title"><span class="chevron">▼</span>${esc(dir === '/' ? '根目录' : dir)}</div><div class="dir-count">${items.length} 个文件 · ${fmt(size)}</div></div><ul>${lis}</ul></section>`;
};

const totalSize = files.reduce((s, f) => s + f.size, 0);
const groupsHtml = dirs.map(d => renderGroup(d, groups.get(d))).join('\n');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>资源索引 · imgSurk</title>
<style>
  :root { --bg: #0f172a; --card: #1e293b; --head: #243244; --line: #334155; --text: #e2e8f0; --muted: #94a3b8; --accent: #38bdf8; }
  * { box-sizing: border-box; }
  html { scrollbar-gutter: stable; overflow-y: scroll; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
  header { position: sticky; top: 0; z-index: 10; background: rgba(15, 23, 42, .92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); padding: 1rem; }
  .inner { max-width: 960px; margin: 0 auto; }
  h1 { font-size: 1.35rem; margin: 0 0 .5rem; }
  .stats { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; font-size: .85rem; color: var(--muted); margin-bottom: .75rem; min-height: 1.8rem; }
  .stats strong { color: var(--text); font-weight: 600; }
  .toggle { margin-left: auto; min-width: 5.5rem; padding: .35rem .7rem; border-radius: 6px; border: 1px solid var(--line); background: #0b1220; color: var(--text); font-size: .8rem; cursor: pointer; text-align: center; }
  .toggle:hover { border-color: var(--accent); color: var(--accent); }
  .search { width: 100%; padding: .6rem .8rem; border-radius: 8px; border: 1px solid var(--line); background: #0b1220; color: var(--text); font-size: .95rem; outline: none; }
  .search:focus { border-color: var(--accent); }
  main { max-width: 960px; margin: 1.5rem auto 3rem; padding: 0 1rem; }
  .empty { text-align: center; color: var(--muted); padding: 2rem; display: none; }
  .dir-group { margin-bottom: 1rem; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--card); }
  .dir-header { display: flex; align-items: center; justify-content: space-between; padding: .7rem 1rem; cursor: pointer; user-select: none; background: var(--head); }
  .dir-header:hover { background: #2a3a50; }
  .dir-title { display: flex; align-items: center; gap: .5rem; font-weight: 600; font-size: .95rem; word-break: break-all; }
  .chevron { transition: transform .2s; font-size: .75rem; color: var(--muted); }
  .dir-group.collapsed .chevron { transform: rotate(-90deg); }
  .dir-group.collapsed ul { display: none; }
  .dir-count { font-size: .78rem; color: var(--muted); white-space: nowrap; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; align-items: center; gap: .75rem; padding: .55rem 1rem; border-top: 1px solid var(--line); font-size: .9rem; }
  li:hover { background: rgba(56, 189, 248, .05); }
  li.hidden { display: none; }
  .ext-tag { flex-shrink: 0; font-size: .66rem; font-weight: 700; text-transform: uppercase; padding: .15rem .4rem; border-radius: 4px; min-width: 3rem; text-align: center; }
  .file-link { color: var(--accent); text-decoration: none; word-break: break-all; flex: 1; }
  .file-link:hover { text-decoration: underline; }
  .file-size { color: var(--muted); font-size: .78rem; white-space: nowrap; flex-shrink: 0; }
  @media (max-width: 600px) { .file-size { display: none; } li { padding: .55rem .75rem; } .toggle { margin-left: 0; } }
</style>
</head>
<body>
<header>
  <div class="inner">
    <h1>📁 资源索引</h1>
    <div class="stats">
      <span>共 <strong>${files.length}</strong> 个文件</span>
      <span><strong>${dirs.length}</strong> 个目录</span>
      <span>总计 <strong>${fmt(totalSize)}</strong></span>
      <button id="toggleAll" class="toggle">全部展开</button>
    </div>
    <input id="search" class="search" type="search" placeholder="搜索文件名或路径..." autocomplete="off">
  </div>
</header>
<main>
  <div id="groups">
${groupsHtml}
  </div>
  <div class="empty" id="empty">没有匹配的文件</div>
</main>
<script>
const search = document.getElementById('search');
const empty = document.getElementById('empty');
const toggleBtn = document.getElementById('toggleAll');
const groupsEls = [...document.querySelectorAll('.dir-group')];

const updateToggle = () => toggleBtn.textContent = groupsEls.some(g => !g.classList.contains('collapsed')) ? '全部折叠' : '全部展开';

document.querySelectorAll('.dir-header').forEach(h => h.onclick = () => {
  h.parentElement.classList.toggle('collapsed');
  updateToggle();
});

toggleBtn.onclick = () => {
  const collapse = groupsEls.some(g => !g.classList.contains('collapsed'));
  groupsEls.forEach(g => g.classList.toggle('collapsed', collapse));
  updateToggle();
};

let timer;
search.oninput = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const q = search.value.trim().toLowerCase();
    let any = false;
    groupsEls.forEach(g => {
      let n = 0;
      g.querySelectorAll('li').forEach(li => {
        const match = !q || li.dataset.name.includes(q);
        li.classList.toggle('hidden', !match);
        if (match) n++;
      });
      g.style.display = n ? '' : 'none';
      g.classList.toggle('collapsed', !q);
      if (n) any = true;
    });
    empty.style.display = any ? 'none' : 'block';
    updateToggle();
  }, 120);
};
</script>
</body>
</html>`;

fs.writeFileSync('index.html', html);
console.log('✅ 已生成 index.html，共 ' + files.length + ' 个文件，' + dirs.length + ' 个目录。');
