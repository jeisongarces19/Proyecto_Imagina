// src/components/LeftRail.jsx
export default function LeftRail({ active, onChange }) {
  const items = [
    { id: 'catalog', label: 'Catálogo', icon: '📦' },
    { id: 'typologies', label: 'Tipologías', icon: '🧩' },
    { id: 'walls', label: 'Muros', icon: '🧱' },
    { id: 'openings', label: 'Puertas/Ventanas', icon: '🚪' },
    { id: 'materials', label: 'Materiales', icon: '🎨' },
    { id: 'plans', label: 'Planos', icon: '🗺️' },
    { id: 'sillas', label: 'Sillas', icon: '🗺️' },
    {
      id: 'koncisaPlus',
      label: 'Koncisa Plus',
      icon: '🪑',
    },
  ];

  return (
    <div
      style={{
        width: 56,
        borderRight: '1px solid #e5e5e5',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: 6,
        gap: 6,
      }}
    >
      {items.map((it) => {
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            type="button"
            title={it.label}
            onClick={() => onChange(it.id)}
            style={{
              height: 44,
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: isActive ? '#111827' : '#fff',
              color: isActive ? '#fff' : '#111827',
              cursor: 'pointer',
              fontSize: 18,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {it.icon}
          </button>
        );
      })}
    </div>
  );
}
