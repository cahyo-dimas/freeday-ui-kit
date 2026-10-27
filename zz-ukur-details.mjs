import { chromium, firefox, webkit } from '@playwright/test';
const url = 'file://' + '/private/tmp/claude-501/-Users-cahyo-d-kurnianto-Data-Project-Portofolio-keamanan-cluster/e423c85b-db3e-407c-9a52-4981e80490fe/scratchpad/pw-test/details.html';
for (const [nama, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const b = await engine.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto(url); await p.waitForTimeout(250);
  const r = await p.evaluate(() => {
    const x = (id) => Math.round(document.getElementById(id).getBoundingClientRect().x);
    const s = document.querySelector('#apaadanya summary');
    const cs = getComputedStyle(s);
    return { apaadanya: x('t1'), kontrol: x('t2'), display: cs.display, listStyleType: cs.listStyleType };
  });
  const geser = r.apaadanya - r.kontrol;
  console.log(`${nama.padEnd(9)} teks x: apa-adanya ${r.apaadanya}, pembanding ${r.kontrol}  -> geser ${geser}px  ${geser !== 0 ? 'PENANDA TAMPIL' : 'bersih'}`);
  console.log(`          summary display=${r.display} list-style-type=${r.listStyleType}`);
  await b.close();
}
