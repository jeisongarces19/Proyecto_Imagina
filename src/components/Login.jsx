import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  const hints = useMemo(
    () => [
      { u: 'admin', p: 'admin123', r: 'Administrador' },
      { u: 'diseno', p: 'diseno123', r: 'Diseño' },
      { u: 'comercial', p: 'comercial123', r: 'Comercial' },
    ],
    []
  );

  const onSubmit = (e) => {
    e.preventDefault();
    const res = login(username, password);
    if (!res.ok) setError(res.error || 'No fue posible iniciar sesión.');
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #f7f7fb, #ffffff)',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          background: '#fff',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.2 }}>Proyecto IMAGINA</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
              Inicia sesión para continuar
            </div>
          </div>
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 999,
              padding: '6px 10px',
              fontSize: 12,
              opacity: 0.85,
              alignSelf: 'flex-start',
            }}
          >
            v1
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>Usuario</span>
            <input
              value={username}
              onChange={(e) => {
                setError('');
                setUsername(e.target.value);
              }}
              placeholder="Ej: admin"
              autoFocus
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #d1d5db',
                outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>Contraseña</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={password}
                onChange={(e) => {
                  setError('');
                  setPassword(e.target.value);
                }}
                placeholder="••••••••"
                type={show ? 'text' : 'password'}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid #d1d5db',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {show ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          {error && (
            <div
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#9f1239',
                padding: '10px 12px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              marginTop: 4,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #111827',
              background: '#111827',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 800,
              letterSpacing: 0.2,
            }}
          >
            Entrar
          </button>
        </form>

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.75 }}>
            Usuarios de prueba
          </summary>
          <div style={{ marginTop: 8, display: 'grid', gap: 6, fontSize: 12 }}>
            {hints.map((h) => (
              <div
                key={h.u}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '8px 10px',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  background: '#fafafa',
                }}
              >
                <span style={{ fontWeight: 800 }}>{h.r}</span>
                <span style={{ opacity: 0.85 }}>
                  {h.u} / {h.p}
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
