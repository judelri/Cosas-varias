// Genera Manual_Comparador.pdf a partir de manual.html con Chromium (Playwright).
// Uso: node generar_pdf.cjs   (necesita el paquete playwright)
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'manual.html'));
  await p.waitForLoadState('networkidle');
  await p.pdf({
    path: path.join(__dirname, '..', 'Manual_Comparador.pdf'),
    format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font:7.5pt Inter,sans-serif;color:#6b6f7a;padding:0 15mm;display:flex;justify-content:space-between">' +
      '<span>Comparador de archivos y carpetas · Manual de usuario</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await b.close();
  console.log('Listo: Manual_Comparador.pdf');
})();
