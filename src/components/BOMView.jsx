import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

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

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    setLocalCountry(newCountry);
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

  const exportToExcel = () => {
    const data = [];
    let rowNumber = 1;

    const bomTitle = groups.find((g) => g.label && g.label !== 'SUELTOS')?.label || 'INVENTARIO BOM';
    let mainTitleSkippedInTable = false;

    // Procesar los grupos con la misma lógica que el render
    for (const g of groups) {
      const isMainTitleGroup =
        !mainTitleSkippedInTable &&
        String(g.label || '').trim().toLowerCase() === String(bomTitle || '').trim().toLowerCase();

      // Fila de encabezado de grupo (excepto el título principal, que va solo arriba)
      if (!isMainTitleGroup) {
        data.push({
          '#': '',
          'Código': '',
          'Descripción': g.label,
          'Cantidad': '',
          'Precio': '',
          'Total': '',
        });
      } else {
        mainTitleSkippedInTable = true;
      }

      // Filas de ítems
      for (const r of g.items) {
        data.push({
          '#': rowNumber,
          'Código': r.code,
          'Descripción': r.description,
          'Cantidad': r.qty,
          'Precio': r.unitPrice,
          'Total': r.total,
        });
        rowNumber++;
      }

      // Fila de subtotal
      data.push({
        '#': '',
        'Código': '',
        'Descripción': 'Subtotal',
        'Cantidad': '',
        'Precio': '',
        'Total': g.subtotal,
      });
      data.push({}); // Fila vacía para separación
    }

    // Fila de total general
    data.push({
      '#': '',
      'Código': '',
      'Descripción': 'TOTAL',
      'Cantidad': '',
      'Precio': '',
      'Total': grandTotal,
    });

    const headers = ['#', 'Código', 'Descripción', 'Cantidad', 'Precio', 'Total'];

    const ws = XLSX.utils.aoa_to_sheet([[bomTitle], [], headers]);
    XLSX.utils.sheet_add_json(ws, data, {
      origin: 'A4',
      skipHeader: true,
      header: headers,
    });

    ws['!merges'] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 5 },
      },
    ];

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 5 },  // #
      { wch: 15 }, // Código
      { wch: 50 }, // Descripción
      { wch: 12 }, // Cantidad
      { wch: 15 }, // Precio
      { wch: 15 }, // Total
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOM');
    XLSX.writeFile(wb, `BOM_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const setSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const thStyle = {
    padding: '9px 12px',
    fontSize: 11.5,
    fontWeight: 600,
    color: 'rgba(15,23,42,0.78)',
    background: '#f8fafc',
    borderBottom: '1px solid rgba(15,23,42,0.10)',
    userSelect: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '9px 12px',
    fontSize: 12,
    color: 'rgba(15,23,42,0.86)',
    borderBottom: '1px solid rgba(15,23,42,0.08)',
    verticalAlign: 'top',
  };

  const numTd = { ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' };
  const colSep = { borderRight: '1px solid rgba(15,23,42,0.08)' };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f3f5f7',
        fontFamily: 'Segoe UI, Inter, Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Header tipo CET */}
      <div
        style={{
          padding: '10px 12px',
          background: '#ffffff',
          borderBottom: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
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
              color: 'rgba(15,23,42,0.86)',
            }}
          >
            <span>INVENTARIO BOM</span>
            <select
              value={localCountry}
              onChange={handleCountryChange}
              style={{
                height: 34,
                borderRadius: 8,
                border: '1px solid #ddd',
                padding: '0 8px',
                background: '#fff',
              }}
            >
              {catalogCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={exportToExcel}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid rgba(15,23,42,0.20)',
                background: '#fff',
                color: 'rgba(15,23,42,0.86)',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f8fafc';
                e.target.style.borderColor = 'rgba(15,23,42,0.30)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fff';
                e.target.style.borderColor = 'rgba(15,23,42,0.20)';
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
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid rgba(15,23,42,0.16)',
                outline: 'none',
                fontSize: 12,
                background: '#ffffff',
                color: 'rgba(15,23,42,0.88)',
              }}
            />
            <div style={{ fontSize: 11.5, color: 'rgba(15,23,42,0.56)' }}>{totalItems} ítem(s)</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f3f5f7' }}>
        <div style={{ padding: 12 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid rgba(15,23,42,0.10)',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                {(() => {
                  // Contador global de filas BOM
                  let rowIdx = 0;
                  return groups.map((g) => (
                  <React.Fragment key={g.key}>
                    {/* Header de grupo */}
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: '8px 12px',
                          background: '#f1f5f9',
                          borderBottom: '1px solid rgba(15,23,42,0.10)',
                          color: 'rgba(15,23,42,0.82)',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {g.label}
                      </td>
                    </tr>

                    {/* Filas del grupo con separador/título por ítem */}
                    {g.items.map((r, i) => {
                      rowIdx += 1;
                      const currentIdx = rowIdx;
                      // Primeras 2 palabras descripción como mini-título
                      const shortDesc = r.description.split(' ').slice(0, 2).join(' ');
                      // Color alternado suave por fila
                      const rowBg = i % 2 === 0 ? '#ffffff' : '#f9fbfc';
                      const titleBg = i % 2 === 0 ? '#f4f8ff' : '#f1f5fb';

                      return (
                        <React.Fragment key={`${g.key}__${r.code}`}>
                          <tr>
                            <td
                              colSpan={6}
                              style={{
                                padding: '4px 10px 3px',
                                fontSize: 10,
                                fontWeight: 800,
                                letterSpacing: 0.5,
                                textTransform: 'uppercase',
                                color: 'rgba(30, 41, 59, 0.94)',
                                background: titleBg,
                                borderBottom: 'none',
                                borderLeft: '3px solid rgba(59,95,192,0.6)',
                              }}
                              title={r.description}
                            >
                              {shortDesc || 'Ítem'}
                            </td>
                          </tr>

                          <tr style={{ background: rowBg }}>
                            {/* Celda numeradora */}
                            <td
                              style={{
                                ...tdStyle,
                                ...colSep,
                                textAlign: 'center',
                                verticalAlign: 'middle',
                                padding: '7px 5px',
                                minWidth: 38,
                                background: rowBg,
                              }}
                            >
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 20,
                                  height: 20,
                                  borderRadius: 5,
                                  background: '#e8f0fe',
                                  color: '#3b5fc0',
                                  fontSize: 10.5,
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
                                fontSize: 11.5,
                                background: rowBg,
                              }}
                            >
                              {r.code}
                            </td>
                            <td style={{ ...tdStyle, ...colSep, background: rowBg }}>{r.description}</td>
                            <td style={{ ...numTd, ...colSep, background: rowBg }}>{r.qty}</td>
                            <td style={{ ...numTd, ...colSep, background: rowBg }}>
                              {moneyByCountry(r.unitPrice, localCountry)}
                            </td>
                            <td style={{ ...numTd, fontWeight: 700, background: rowBg }}>
                              {moneyByCountry(r.total, localCountry)}
                            </td>
                          </tr>

                          {/* Separador con border después de cada ítem */}
                          <tr style={{ background: rowBg, height: 12 }}>
                            <td colSpan={6} style={{ height: 12, padding: 0, border: 'none', background: rowBg, borderBottom: '1px solid rgba(15,23,42,0.12)' }} />
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
                          fontWeight: 600,
                          background: '#f8fafc',
                          color: 'rgba(15,23,42,0.70)',
                        }}
                      >
                        Subtotal
                      </td>
                      <td
                        style={{
                          ...numTd,
                          fontWeight: 700,
                          background: '#f8fafc',
                        }}
                      >
                        {moneyByCountry(g.subtotal, localCountry)}
                      </td>
                    </tr>
                  </React.Fragment>
                  ));
                })()}

                {!groups.length && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: 18,
                        textAlign: 'center',
                        color: 'rgba(15,23,42,0.55)',
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
                background: '#f8fafc',
                borderTop: '1px solid rgba(15,23,42,0.10)',
                fontSize: 12.5,
              }}
            >
              <div style={{ color: 'rgba(15,23,42,0.62)', fontWeight: 600 }}>Total:</div>
              <div style={{ fontWeight: 800, color: 'rgba(15,23,42,0.90)' }}>
                {moneyByCountry(grandTotal, localCountry)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
