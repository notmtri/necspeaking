// node render.js  ->  cover.pdf, body.pdf  (reads toc.json for page numbers if present)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'); const D = __dirname;
const SRC = 'file:///home/user/necspeaking/demos/vinuni-faculty-community/src/assets';
const fill = s => s.replaceAll('{{FONTS}}', SRC + '/fonts').replaceAll('{{ASSETS}}', SRC).replaceAll('{{SHOTS}}', 'file://' + D + '/shots-print');
const strip = s => s.replace(/<span class="tag[^>]*>.*?<\/span>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
(async () => {
  let html = fs.readFileSync(D + '/proposal.html', 'utf8');
  const pages = fs.existsSync(D + '/toc.json') ? JSON.parse(fs.readFileSync(D + '/toc.json', 'utf8')) : {};
  const entries = [];
  for (const m of html.matchAll(/<h([23])[^>]*id="([\w-]+)"[^>]*><span class="n">([^<]+)<\/span>(.*?)<\/h\1>/g)) entries.push({ lvl: m[1], id: m[2], n: m[3], t: strip(m[4]) });
  const toc = entries.map(e => `<a class="${e.lvl === '3' ? 'sub' : ''}" href="#${e.id}"><span class="n">${e.n}</span><span>${e.t}</span><span class="dots"></span><span class="pg">${pages[e.n] || '00'}</span></a>`).join('');
  fs.writeFileSync(D + '/toc-entries.json', JSON.stringify(entries.map(e => ({ n: e.n, t: e.t }))));
  html = fill(html).replace('{{TOC}}', toc);
  fs.writeFileSync(D + '/body.built.html', html);
  fs.writeFileSync(D + '/cover.built.html', fill(fs.readFileSync(D + '/cover.html', 'utf8')));
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + D + '/cover.built.html'); await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: D + '/cover.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
  await p.goto('file://' + D + '/body.built.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const foot = `<div style="width:100%;font-size:7.5pt;color:#737B8C;padding:0 18mm;display:flex;justify-content:space-between;font-family:Helvetica,Arial,sans-serif"><span>International Faculty Community Platform · Pilot proposal</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
  const head = `<div style="width:100%;padding:0 18mm"><div style="height:1.2mm;width:16mm;background:#C72027"></div></div>`;
  await p.pdf({ path: D + '/body.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: head, footerTemplate: foot, outline: true, tagged: true });
  await b.close(); console.log('rendered', entries.length, 'toc entries');
})().catch(e => { console.error(e); process.exit(1); });
