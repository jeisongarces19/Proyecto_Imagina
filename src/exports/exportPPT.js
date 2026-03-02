import PptxGenJS from 'pptxgenjs';
import { PPT_STYLE } from './pptTemplate';

function addHeader(pptx, slide, title) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.75,
    fill: { color: PPT_STYLE.headerBg },
    line: { color: PPT_STYLE.headerBg },
  });
  slide.addText(title, {
    x: 0.6,
    y: 0.18,
    w: 12.2,
    h: 0.45,
    fontFace: PPT_STYLE.font,
    fontSize: 22,
    color: PPT_STYLE.headerFg,
    bold: true,
  });
}

export async function exportProjectPPT({
  projectName = 'Proyecto',
  planPngDataUrl, // <-- dataURL del canvas 2D
  threePngDataUrl = null, // <-- opcional: screenshot del canvas 3D
  bomItems = [], // [{code, description, qty, unitPrice, total}]
}) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // Slide 1
  {
    const s = pptx.addSlide();
    addHeader(pptx, s, 'Jeison IMAGINA — Export');
    s.addText(projectName, {
      x: 0.8,
      y: 1.4,
      w: 11.7,
      h: 0.6,
      fontFace: PPT_STYLE.font,
      fontSize: 28,
      bold: true,
    });
    s.addText('Incluye plano 2D, vista 3D y BOM.', {
      x: 0.8,
      y: 2.2,
      w: 11.7,
      h: 0.4,
      fontFace: PPT_STYLE.font,
      fontSize: 14,
      color: '334155',
    });
  }

  // Slide 2: Plano 2D (+ 3D opcional)
  {
    const s = pptx.addSlide();
    addHeader(pptx, s, 'Plano 2D (overlay)');

    // 2D grande
    s.addImage({ data: planPngDataUrl, x: 0.6, y: 1.0, w: 8.2, h: 6.9 });

    // 3D pequeño (si lo mandas)
    if (threePngDataUrl) {
      s.addText('Vista 3D', {
        x: 9.0,
        y: 1.0,
        w: 3.9,
        h: 0.3,
        fontFace: PPT_STYLE.font,
        fontSize: 12,
        bold: true,
        color: '334155',
      });
      s.addImage({ data: threePngDataUrl, x: 9.0, y: 1.4, w: 3.9, h: 2.4 });
    }

    s.addText('Tip: esta imagen sale directamente del canvas 2D (plano + bloques + muros).', {
      x: 9.0,
      y: 4.1,
      w: 3.9,
      h: 1.2,
      fontFace: PPT_STYLE.font,
      fontSize: 10.5,
      color: '475569',
    });
  }

  // Slide 3: BOM
  {
    const s = pptx.addSlide();
    addHeader(pptx, s, 'BOM');

    const header = ['Código', 'Descripción', 'Qty', 'Precio', 'Total'];
    const rows = [header].concat(
      (bomItems || [])
        .slice(0, 20)
        .map((r) => [
          String(r.code ?? ''),
          String(r.description ?? ''),
          String(r.qty ?? ''),
          String(r.unitPrice ?? ''),
          String(r.total ?? ''),
        ])
    );

    s.addTable(rows, {
      x: 0.6,
      y: 1.1,
      w: 12.1,
      h: 5.8,
      fontFace: PPT_STYLE.font,
      fontSize: 10,
      border: { type: 'solid', color: 'E5E7EB', pt: 1 },
      fill: 'FFFFFF',
      rowH: 0.32,
    });
  }

  await pptx.writeFile({ fileName: `${projectName}_export.pptx` });
}
