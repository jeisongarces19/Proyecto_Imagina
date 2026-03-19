import React, { useMemo, useState } from 'react';

function moneyCOP(v) {
  const n = Number(v || 0);
  return n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

function safeStr(v) {
  return (v ?? '').toString();
}

export default function BOMView({ items = [] }) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('code'); // code | description | qty | unitPrice | total
  const [sortDir, setSortDir] = useState('asc'); // asc | desc

  const groups = useMemo(() => {
    const norm = (s) => safeStr(s).toLowerCase();
    const qq = norm(q.trim());

    // 1) Normaliza (compat con emitBOM viejo/nuevo)
    let list = (items || []).map((it) => {
      const qty = Number(it.qty || 0);

      // ✅ soporta unitPrice o price
      const unitPrice = Number(it.unitPrice ?? it.price ?? 0);

      // ✅ soporta total explícito o qty*unitPrice
      const total = Number(it.total ?? qty * unitPrice);

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
  }, [items, q, sortKey, sortDir]);

  const grandTotal = useMemo(() => groups.reduce((acc, g) => acc + (g.subtotal || 0), 0), [groups]);

  const totalItems = useMemo(() => groups.reduce((acc, g) => acc + g.items.length, 0), [groups]);

  const setSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const thStyle = {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(0,0,0,0.72)',
    background: '#f2f6f9',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    userSelect: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '10px 12px',
    fontSize: 12.5,
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    verticalAlign: 'top',
  };

  const numTd = { ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header tipo CET */}
      <div
        style={{ padding: 12, background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
      >
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14, color: 'rgba(0,0,0,0.78)' }}>
            INVENTARIO BOM
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar código o descripción…"
              style={{
                width: 320,
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                outline: 'none',
                fontSize: 12.5,
              }}
            />
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{totalItems} ítem(s)</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f7f7f7' }}>
        <div style={{ padding: 12 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => setSort('code')}>
                    Código
                  </th>
                  <th style={thStyle} onClick={() => setSort('description')}>
                    Descripción
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => setSort('qty')}>
                    Cantidad
                  </th>
                  <th
                    style={{ ...thStyle, textAlign: 'right' }}
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
                {groups.map((g) => (
                  <React.Fragment key={g.key}>
                    {/* Header de grupo */}
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: '10px 12px',
                          background: '#eef4f8',
                          fontWeight: 900,
                        }}
                      >
                        {g.label}
                      </td>
                    </tr>

                    {/* Filas del grupo */}
                    {g.items.map((r) => (
                      <tr key={`${g.key}__${r.code}`}>
                        <td
                          style={{
                            ...tdStyle,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          }}
                        >
                          {r.code}
                        </td>
                        <td style={tdStyle}>{r.description}</td>
                        <td style={numTd}>{r.qty}</td>
                        <td style={numTd}>{moneyCOP(r.unitPrice)}</td>
                        <td style={{ ...numTd, fontWeight: 800 }}>{moneyCOP(r.total)}</td>
                      </tr>
                    ))}

                    {/* Subtotal del grupo */}
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontWeight: 800,
                          background: '#fbfdff',
                        }}
                      >
                        Subtotal
                      </td>
                      <td style={{ ...numTd, fontWeight: 900, background: '#fbfdff' }}>
                        {moneyCOP(g.subtotal)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}

                {!groups.length && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: 18, textAlign: 'center', color: 'rgba(0,0,0,0.55)' }}
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
                background: '#fbfdff',
                borderTop: '1px solid rgba(0,0,0,0.08)',
                fontSize: 13,
              }}
            >
              <div style={{ color: 'rgba(0,0,0,0.60)' }}>Total:</div>
              <div style={{ fontWeight: 900 }}>{moneyCOP(grandTotal)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
