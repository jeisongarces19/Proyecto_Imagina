import React, { useMemo, useState } from 'react';

function moneyByCountry(v, country = 'CO') {
  const n = Number(v || 0);
  const isCO = country === 'CO';
  const decimals = isCO ? 0 : 2;

  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const fixed = abs.toFixed(decimals);
  const [intPartRaw, decPart] = fixed.split('.');
  const intPart = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decimals === 0) {
    return `${sign}$ ${intPart}`;
  }

  return `${sign}$ ${intPart},${decPart}`;
}

function safeStr(v) {
  return (v ?? '').toString();
}

export default function BOMView({
  items = [],
  defaultCountry = 'CO',
  catalogCountries = ['CO', 'EUC', 'USD'],
}) {
  const [q, setQ] = useState('');
  const [localCountry, setLocalCountry] = useState(defaultCountry);
  const [sortKey, setSortKey] = useState('code'); // code | description | qty | unitPrice | total
  const [sortDir, setSortDir] = useState('asc'); // asc | desc
  const [showModal, setShowModal] = useState(false);
  const [corporateData, setCorporateData] = useState({
    proyecto: '',
    asesor: '',
    cliente: '',
    fecha: new Date().toISOString().split('T')[0],
    version: '1',
  });

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    setLocalCountry(newCountry);
  };

  const handleCorporateChange = (e) => {
    const { name, value } = e.target;
    setCorporateData((prev) => ({ ...prev, [name]: value }));
  };

  const groups = useMemo(() => {
    const norm = (s) => safeStr(s).toLowerCase();
    const qq = norm(q.trim());

    // 1) Normaliza (compat con emitBOM viejo/nuevo)
    let list = (items || []).map((it) => {
      const qty = Number(it.qty || 0);

      const prices = {
        CO: Number(it?.prices?.CO ?? 0),
        EUC: Number(it?.prices?.EUC ?? 0),
        USD: Number(it?.prices?.USD ?? 0),
      };

      // ✅ soporta unitPrice o price
      const fallbackUnitPrice = Number(it.unitPrice ?? it.price ?? 0);
      const unitPrice = Number(prices[localCountry] || fallbackUnitPrice);

      // ✅ soporta total explícito o qty*unitPrice
      const total = Number(qty * unitPrice);

      // ✅ grouping compat:
      // - preferimos groupId/groupName (nuevo)
      // - si no existen, usamos groupKey/groupLabel (viejo)
      // - si no existen, SUELTOS
      const gidRaw = it.groupId ?? it.groupKey ?? null;
      const gnameRaw = it.groupName ?? it.groupLabel ?? null;

      const gid = safeStr(gidRaw).trim();
      const gname = safeStr(gnameRaw).trim();

      const isGrouped = !!gid && gid.toLowerCase() !== 'null' && gid.toLowerCase() !== 'undefined';

      return {
        // para agrupar: tipologías como "T:<codigo>", sueltos como "S:SUELTOS"
        groupKey: isGrouped ? `T:${gid}` : 'S:SUELTOS',
        groupLabel: isGrouped ? gname || `Tipología ${gid}` : 'SUELTOS',

        code: safeStr(it.code),
        description: safeStr(it.description),
        qty,
        groupCount: Number(it.groupCount || 0),
        unitPrice,
        total,
        prices,

        // alias para no tocar tu render actual (si usabas r.price)
        price: unitPrice,
      };
    });

    // 2) Filtro
    if (qq) {
      list = list.filter((r) => norm(r.code).includes(qq) || norm(r.description).includes(qq));
    }

    // 3) Sort dentro de cada grupo
    const dir = sortDir === 'asc' ? 1 : -1;

    // 4) Agrupa
    const map = new Map(); // groupKey -> {label, items[]}
    for (const r of list) {
      if (!map.has(r.groupKey)) map.set(r.groupKey, { label: r.groupLabel, items: [] });
      map.get(r.groupKey).items.push(r);
    }

    // 5) Orden de grupos: tipologías primero, sueltos al final
    const groupArr = Array.from(map.entries()).map(([key, val]) => ({
      key,
      label: val.label,
      items: val.items,
      subtotal: 0,
    }));

    groupArr.sort((a, b) => {
      const aIsLoose = a.key.startsWith('S:');
      const bIsLoose = b.key.startsWith('S:');
      if (aIsLoose !== bIsLoose) return aIsLoose ? 1 : -1;
      return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
    });

    // 6) Sort items dentro de cada grupo
    for (const g of groupArr) {
      g.items.sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];

        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return safeStr(va).localeCompare(safeStr(vb), 'es', { sensitivity: 'base' }) * dir;
      });

      // 7) Subtotal
      g.subtotal = g.items.reduce((acc, r) => acc + (r.total || 0), 0);
    }

    return groupArr;
  }, [items, q, sortKey, sortDir, localCountry]);

  const grandTotal = useMemo(() => groups.reduce((acc, g) => acc + (g.subtotal || 0), 0), [groups]);

  const totalItems = useMemo(() => groups.reduce((acc, g) => acc + g.items.length, 0), [groups]);

  const exportToProfessionalExcel = async () => {
    const excelModule = await import('exceljs/dist/exceljs.min.js');
    const ExcelJS = excelModule.default || excelModule;
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Cotización');

    ws.columns = [
      { width: 15 },
      { width: 50 },
      { width: 10 },
      { width: 15 },
      { width: 15 },
      { width: 12 },
      { width: 10 },
      { width: 20 },
    ];

    const thin = { style: 'thin', color: { argb: 'FFD9D9D9' } };
    const border = { top: thin, right: thin, bottom: thin, left: thin };
    const fillGreen = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006666' } };
    const fillMint = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9FE1D0' } };
    const fillGray = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF767171' } };
    const fillBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDEEBF7' } };
    const fillPurple = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF660066' } };

    const applyStyle = (cell, opts = {}) => {
      cell.border = border;
      if (opts.fill) cell.fill = opts.fill;
      if (opts.font) cell.font = opts.font;
      if (opts.alignment) cell.alignment = opts.alignment;
      if (opts.numFmt) cell.numFmt = opts.numFmt;
    };

    const bufferToBase64 = (arrayBuffer) => {
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let idx = 0; idx < bytes.byteLength; idx += 1) binary += String.fromCharCode(bytes[idx]);
      return btoa(binary);
    };

    const mimeToExtension = (mime = '') => {
      const normalized = mime.toLowerCase();
      if (normalized.includes('image/png')) return 'png';
      if (normalized.includes('image/jpeg') || normalized.includes('image/jpg')) return 'jpeg';
      if (normalized.includes('image/gif')) return 'gif';
      return null;
    };

    const fetchImageAsset = async (candidates = []) => {
      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate);
          if (!response.ok) continue;
          const contentType = response.headers.get('content-type') || '';
          const imageExtByMime = mimeToExtension(contentType);
          if (!imageExtByMime) continue;
          const imageBuffer = await response.arrayBuffer();
          return {
            base64: bufferToBase64(imageBuffer),
            extension: imageExtByMime,
          };
        } catch {
          // intenta siguiente ruta
        }
      }
      return null;
    };

    const titleRow = ws.addRow(['FORMATO DE COTIZACIÓN', '', '', '', '', '', '', '']);
    titleRow.height = 50;
    ws.mergeCells('A1:H1');
    ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1'].forEach((addr) => {
      applyStyle(ws.getCell(addr), { fill: fillGreen });
    });
    applyStyle(ws.getCell('A1'), {
      fill: fillGreen,
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'middle', indent: 2 },
    });

    try {
      const logoImage = await fetchImageAsset([
        '/assets/imagen/Imagen1.png',
        '/assets/imagen/imagen1.png',
        './assets/imagen/Imagen1.png',
      ]);

      if (logoImage) {
        const imageId = workbook.addImage({
          base64: `data:image/${logoImage.extension};base64,${logoImage.base64}`,
          extension: logoImage.extension,
        });
        ws.addImage(imageId, {
          tl: { col: 3.35, row: 0.16 },
          ext: { width: 185, height: 36 },
        });
      } else {
        console.warn('No se pudo cargar el logo en /assets/imagen/Imagen1.png');
      }
    } catch (error) {
      console.warn('No se pudo insertar imagen en el Excel:', error);
    }

    ws.addRow(['PROYECTO:', corporateData.proyecto, '', 'FECHA DE CREACION:', corporateData.fecha, 'VERSIÓN:', corporateData.version, '']);
    ws.addRow(['ASESOR:', corporateData.asesor, '', 'DISEÑADOR (A):', corporateData.cliente, '', '', '']);
    ws.addRow(['Part Number', 'Description', 'Quantity', 'Tipología', 'TOTAL', 'List', 'Ent. Sd.', 'NOTES']);

    ['A2', 'D2', 'F2', 'A3', 'D3'].forEach((addr) => {
      applyStyle(ws.getCell(addr), {
        fill: fillMint,
        font: { bold: true, color: { argb: 'FF000000' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
      });
    });
    ['B2', 'C2', 'E2', 'G2', 'H2', 'B3', 'C3', 'E3', 'F3', 'G3', 'H3'].forEach((addr) => {
      applyStyle(ws.getCell(addr));
    });
    ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4'].forEach((addr) => {
      applyStyle(ws.getCell(addr), {
        fill: fillGray,
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
    });

    for (const g of groups) {
      const typologyCode = g.key?.startsWith('T:') ? g.key.slice(2).trim() : '';
      const typologyTitle = typologyCode ? `${typologyCode} - ${g.label}` : g.label;
      const isTypologyGroup = !!typologyCode;
      const typologyCount = isTypologyGroup
        ? Math.max(
            1,
            Math.round(
              g.items.reduce((maxCount, item) => Math.max(maxCount, Number(item.groupCount || 0)), 0)
            ) || 1
          )
        : 0;

      if (typologyCode) {
        const typologyImage = await fetchImageAsset([
          `/assets/imagen/${typologyCode}.png`,
          `/assets/imagen/${typologyCode}.jpeg`,
          `/assets/imagen/${typologyCode}.jpg`,
          `/assets/imagen/${typologyCode}.webp`,
        ]);

        if (typologyImage) {
          const imageRow = ws.addRow(['', '', '', '', '', '', '', '']);
          imageRow.height = 260;
          ws.mergeCells(`A${imageRow.number}:H${imageRow.number}`);
          applyStyle(ws.getCell(`A${imageRow.number}`));

          const typologyImageId = workbook.addImage({
            base64: `data:image/${typologyImage.extension};base64,${typologyImage.base64}`,
            extension: typologyImage.extension,
          });
          ws.addImage(typologyImageId, {
            tl: { col: 1.99, row: imageRow.number - 1 + 0.04 },
            ext: { width: 420, height: 220 },
          });
        }
      }

      const groupRow = ws.addRow([typologyTitle, '', '', '', '', '', '', '']);
      ws.mergeCells(`A${groupRow.number}:H${groupRow.number}`);
      applyStyle(ws.getCell(`A${groupRow.number}`), {
        fill: fillPurple,
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        alignment: { horizontal: 'left', vertical: 'middle' },
      });

      const itemRowNumbers = [];
      for (const r of g.items) {
        const aggregatedQty = Number(r.qty || 0);
        const quantityBaseRaw = isTypologyGroup && typologyCount > 0 ? aggregatedQty / typologyCount : aggregatedQty;
        const quantityBase = Number.isInteger(quantityBaseRaw)
          ? quantityBaseRaw
          : Number(quantityBaseRaw.toFixed(4));
        const quantityTotal = isTypologyGroup ? quantityBase * typologyCount : aggregatedQty;

        const row = ws.addRow([
          r.code,
          r.description,
          quantityBase,
          '',
          isTypologyGroup ? quantityTotal : '',
          r.unitPrice,
          r.total,
          '',
        ]);
        itemRowNumbers.push(row.number);
        applyStyle(ws.getCell(`A${row.number}`), { alignment: { horizontal: 'left', vertical: 'middle' } });
        applyStyle(ws.getCell(`B${row.number}`), { alignment: { horizontal: 'left', vertical: 'middle' } });
        applyStyle(ws.getCell(`C${row.number}`), { alignment: { horizontal: 'center', vertical: 'middle' } });
        applyStyle(ws.getCell(`D${row.number}`), { alignment: { horizontal: 'center', vertical: 'middle' } });
        applyStyle(ws.getCell(`E${row.number}`), { alignment: { horizontal: 'center', vertical: 'middle' } });
        applyStyle(ws.getCell(`F${row.number}`), { alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: '#,##0' });
        applyStyle(ws.getCell(`G${row.number}`), { alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: '#,##0' });
        applyStyle(ws.getCell(`H${row.number}`), { alignment: { horizontal: 'left', vertical: 'middle' } });
      }

      if (isTypologyGroup && itemRowNumbers.length > 0) {
        const tipologyStartRow = itemRowNumbers[0];
        const tipologyEndRow = itemRowNumbers[itemRowNumbers.length - 1];
        if (tipologyEndRow > tipologyStartRow) {
          ws.mergeCells(`D${tipologyStartRow}:D${tipologyEndRow}`);
        }
        ws.getCell(`D${tipologyStartRow}`).value = typologyCount;
        applyStyle(ws.getCell(`D${tipologyStartRow}`), {
          alignment: { horizontal: 'center', vertical: 'middle' },
          font: { bold: true, size: 16, color: { argb: 'FF000000' } },
        });
      }

      const subtotalRow = ws.addRow(['', 'Subtotal', '', '', '', '', g.subtotal, '']);
      ['A', 'C', 'D', 'E', 'F', 'H'].forEach((col) => applyStyle(ws.getCell(`${col}${subtotalRow.number}`)));
      applyStyle(ws.getCell(`B${subtotalRow.number}`), {
        font: { bold: true, color: { argb: 'FF000000' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
      });
      applyStyle(ws.getCell(`G${subtotalRow.number}`), {
        fill: fillBlue,
        font: { bold: true, color: { argb: 'FF000000' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        numFmt: '#,##0',
      });

      ws.addRow([]);
    }

    const totalRow = ws.addRow(['', 'TOTAL', '', '', '', '', grandTotal, '']);
    ['A', 'C', 'D', 'E', 'F', 'H'].forEach((col) => applyStyle(ws.getCell(`${col}${totalRow.number}`)));
    applyStyle(ws.getCell(`B${totalRow.number}`), {
      fill: fillPurple,
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'right', vertical: 'middle' },
    });
    applyStyle(ws.getCell(`G${totalRow.number}`), {
      fill: fillPurple,
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'right', vertical: 'middle' },
      numFmt: '#,##0',
    });

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Cotizacion_${corporateData.proyecto || 'Proyecto'}_${corporateData.fecha}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleExportProfessional = async () => {
    try {
      await exportToProfessionalExcel();
      setShowModal(false);
    } catch (error) {
      console.error('Error al exportar cotización:', error);
      window.alert('No se pudo exportar la cotización. Revisa la consola para más detalle.');
    }
  };

  const palette = {
    pageBg: '#eef2f6',
    panelBg: '#ffffff',
    panelBorder: 'rgba(148, 163, 184, 0.24)',
    panelShadow: '0 10px 26px rgba(15,23,42,0.05)',
    toolbarBg: '#f8fafc',
    toolbarBorder: 'rgba(148, 163, 184, 0.22)',
    stickyBg: '#dfe7f1',
    stickyBorder: 'rgba(100, 116, 139, 0.28)',
    stickyText: '#22324d',
    groupBg: '#f3f6fa',
    groupAccent: '#7c8faa',
    rowAlt: '#fafbfd',
    subtotalBg: '#f6f8fb',
    line: 'rgba(148, 163, 184, 0.20)',
    text: '#0f172a',
    muted: 'rgba(51,65,85,0.72)',
    soft: 'rgba(71,85,105,0.62)',
    badgeBg: '#eef3f8',
    badgeText: '#40536f',
    numberBg: '#edf2f7',
    numberBorder: 'rgba(100,116,139,0.20)',
    numberText: '#334155',
  };

  const setSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const thStyle = {
    padding: '5px 8px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
    color: palette.stickyText,
    background: palette.stickyBg,
    borderBottom: `1px solid ${palette.stickyBorder}`,
    position: 'sticky',
    top: 0,
    zIndex: 3,
    boxShadow: '0 3px 10px rgba(15,23,42,0.06)',
    backgroundClip: 'padding-box',
    userSelect: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '5px 8px',
    fontSize: 11.5,
    color: palette.text,
    borderBottom: `1px solid ${palette.line}`,
    verticalAlign: 'middle',
  };

  const numTd = { ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' };
  const colSep = { borderRight: `1px solid ${palette.line}` };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: palette.pageBg,
        fontFamily: 'Segoe UI, Inter, Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Header tipo CET */}
      <div
        style={{
          padding: '12px 14px',
          background: palette.toolbarBg,
          borderBottom: `1px solid ${palette.toolbarBorder}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.2,
              color: palette.text,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 13.5, letterSpacing: 0.3 }}>INVENTARIO BOM</span>
            <div
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                background: palette.badgeBg,
                color: palette.badgeText,
                fontSize: 11,
                fontWeight: 700,
                border: `1px solid ${palette.line}`,
              }}
            >
              {totalItems} ítem(s)
            </div>
            <select
              value={localCountry}
              onChange={handleCountryChange}
              style={{
                height: 34,
                borderRadius: 8,
                border: `1px solid ${palette.line}`,
                padding: '0 10px',
                background: '#fff',
                color: palette.text,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {catalogCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowModal(true)}
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 8,
                border: `1px solid ${palette.line}`,
                background: '#fff',
                color: palette.text,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f3f6fa';
                e.target.style.borderColor = 'rgba(100,116,139,0.34)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fff';
                e.target.style.borderColor = 'rgba(148, 163, 184, 0.20)';
              }}
            >
              Exportar
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar código o descripción…"
              style={{
                width: 320,
                padding: '8px 11px',
                borderRadius: 8,
                border: `1px solid ${palette.line}`,
                outline: 'none',
                fontSize: 12,
                background: '#ffffff',
                color: palette.text,
              }}
            />
            <div style={{ fontSize: 11.5, color: palette.soft }}>Vista agrupada por tipología</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflow: 'auto', background: palette.pageBg }}>
        <div style={{ padding: 4 }}>
          <div
            style={{
              background: palette.panelBg,
              borderRadius: 12,
              overflow: 'visible',
              border: `1px solid ${palette.panelBorder}`,
              boxShadow: palette.panelShadow,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {/* Columna numeradora */}
                  <th style={{ ...thStyle, ...colSep, textAlign: 'center', width: 38 }}>#</th>
                  <th style={{ ...thStyle, ...colSep }} onClick={() => setSort('code')}>
                    Código
                  </th>
                  <th style={{ ...thStyle, ...colSep }} onClick={() => setSort('description')}>
                    Descripción
                  </th>
                  <th
                    style={{ ...thStyle, ...colSep, textAlign: 'right' }}
                    onClick={() => setSort('qty')}
                  >
                    Cantidad
                  </th>
                  <th
                    style={{ ...thStyle, ...colSep, textAlign: 'right' }}
                    onClick={() => setSort('unitPrice')}
                  >
                    Precio
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => setSort('total')}>
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {groups.map((g) => {
                  const typologyCode = g.key?.startsWith('T:') ? g.key.slice(2) : '';
                  const typologyTitle = typologyCode ? `Tipología - ${typologyCode}` : 'Tipología';

                  return (
                  <React.Fragment key={g.key}>
                    {/* Header de grupo */}
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: '5px 8px',
                          background: palette.groupBg,
                          borderBottom: `1px solid ${palette.line}`,
                          color: palette.text,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                width: 4,
                                alignSelf: 'stretch',
                                borderRadius: 999,
                                background: palette.groupAccent,
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 11,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.6,
                                  color: palette.soft,
                                  marginBottom: 2,
                                }}
                              >
                                {typologyTitle}
                              </div>
                              <div style={{ lineHeight: 1.35 }}>{g.label}</div>
                            </div>
                          </div>
                          <div
                            style={{
                              whiteSpace: 'nowrap',
                              fontSize: 11,
                              fontWeight: 700,
                              color: palette.muted,
                              background: '#ffffff',
                              border: `1px solid ${palette.line}`,
                              borderRadius: 999,
                              padding: '4px 9px',
                            }}
                          >
                            {g.items.length} componente(s)
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Filas del grupo */}
                    {g.items.map((r, i) => {
                      const currentIdx = i + 1;
                      const rowBg = i % 2 === 0 ? '#ffffff' : palette.rowAlt;

                      return (
                        <React.Fragment key={`${g.key}__${r.code}`}>
                          <tr style={{ background: rowBg }}>
                            {/* Celda numeradora */}
                            <td
                              style={{
                                ...tdStyle,
                                ...colSep,
                                textAlign: 'center',
                                verticalAlign: 'middle',
                                padding: '3px 4px',
                                minWidth: 38,
                                background: rowBg,
                              }}
                            >
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 22,
                                  height: 22,
                                  padding: '0 6px',
                                  borderRadius: 999,
                                  background: palette.numberBg,
                                  border: `1px solid ${palette.numberBorder}`,
                                  color: palette.numberText,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {currentIdx}
                              </div>
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                ...colSep,
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                fontSize: 11,
                                color: palette.muted,
                                background: rowBg,
                              }}
                            >
                              {r.code}
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                ...colSep,
                                background: rowBg,
                                lineHeight: 1.4,
                              }}
                            >
                              {r.description}
                            </td>
                            <td style={{ ...numTd, ...colSep, background: rowBg }}>{r.qty}</td>
                            <td style={{ ...numTd, ...colSep, background: rowBg }}>
                              {moneyByCountry(r.unitPrice, localCountry)}
                            </td>
                            <td style={{ ...numTd, fontWeight: 700, background: rowBg }}>
                              {moneyByCountry(r.total, localCountry)}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}

                    {/* Subtotal del grupo */}
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontWeight: 700,
                          background: palette.subtotalBg,
                          color: palette.muted,
                          borderTop: `1px solid ${palette.line}`,
                        }}
                      >
                        Subtotal
                      </td>
                      <td
                        style={{
                          ...numTd,
                          fontWeight: 800,
                          background: palette.subtotalBg,
                          color: palette.text,
                          borderTop: `1px solid ${palette.line}`,
                        }}
                      >
                        {moneyByCountry(g.subtotal, localCountry)}
                      </td>
                    </tr>
                  </React.Fragment>
                  );
                })}

                {!groups.length && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: 18,
                        textAlign: 'center',
                        color: palette.soft,
                        fontSize: 12,
                      }}
                    >
                      No hay ítems para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Footer total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 14,
                padding: '10px 12px',
                background: palette.stickyBg,
                borderTop: `1px solid ${palette.stickyBorder}`,
                boxShadow: '0 -8px 18px rgba(15,23,42,0.08)',
                fontSize: 12.5,
                position: 'sticky',
                bottom: 0,
                zIndex: 2,
              }}
            >
              <div style={{ color: palette.muted, fontWeight: 700, letterSpacing: 0.2 }}>Total:</div>
              <div style={{ fontWeight: 800, color: palette.stickyText, fontSize: 13.5 }}>
                {moneyByCountry(grandTotal, localCountry)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de datos corporativos */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15,23,42,0.48)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              border: `1px solid ${palette.line}`,
              boxShadow: '0 20px 60px rgba(15,23,42,0.12)',
              padding: '24px',
              maxWidth: 500,
              width: '90%',
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px 0', color: palette.text, fontSize: 16, fontWeight: 700 }}>
              Datos para Cotización
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: palette.muted }}>
                  Proyecto
                </label>
                <input
                  type="text"
                  name="proyecto"
                  value={corporateData.proyecto}
                  onChange={handleCorporateChange}
                  placeholder="Nombre del proyecto"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${palette.line}`,
                    fontSize: 12,
                    color: palette.text,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: palette.muted }}>
                  Asesor
                </label>
                <input
                  type="text"
                  name="asesor"
                  value={corporateData.asesor}
                  onChange={handleCorporateChange}
                  placeholder="Nombre del asesor"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${palette.line}`,
                    fontSize: 12,
                    color: palette.text,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: palette.muted }}>
                  Diseñador (A)
                </label>
                <input
                  type="text"
                  name="cliente"
                  value={corporateData.cliente}
                  onChange={handleCorporateChange}
                  placeholder="Nombre del diseñador"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${palette.line}`,
                    fontSize: 12,
                    color: palette.text,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: palette.muted }}>
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={corporateData.fecha}
                    onChange={handleCorporateChange}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${palette.line}`,
                      fontSize: 12,
                      color: palette.text,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: palette.muted }}>
                    Versión
                  </label>
                  <input
                    type="text"
                    name="version"
                    value={corporateData.version}
                    onChange={handleCorporateChange}
                    placeholder="1"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${palette.line}`,
                      fontSize: 12,
                      color: palette.text,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: `1px solid ${palette.line}`,
                  background: '#f8fafc',
                  color: palette.text,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleExportProfessional}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: palette.stickyBg,
                  color: palette.stickyText,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Exportar Cotización
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
