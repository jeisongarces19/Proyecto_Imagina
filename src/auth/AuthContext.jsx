import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

// ⚠️ Demo/local login (sin backend)
// Puedes cambiar claves luego o conectarlo a tu API.
const USERS = [
  { username: 'admin', password: 'admin123', role: 'administrador', label: 'Administrador' },
  { username: 'diseno', password: 'diseno123', role: 'diseno', label: 'Diseño' },
  { username: 'comercial', password: 'comercial123', role: 'comercial', label: 'Comercial' },
];

const STORAGE_KEY = 'imagina.auth.user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (username, password) => {
    const u = USERS.find(
      (x) => x.username === String(username).trim() && x.password === String(password)
    );
    if (!u) return { ok: false, error: 'Usuario o contraseña incorrectos.' };

    const safeUser = { username: u.username, role: u.role, label: u.label };
    setUser(safeUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
    } catch {
      // ignore
    }
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider />');
  return ctx;
}

export function getRolePermissions(role) {
  const r = String(role || '').toLowerCase();
  const isAdmin = r === 'administrador' || r === 'admin';
  const isDesign = r === 'diseno' || r === 'diseño';
  const isCommercial = r === 'comercial';

  return {
    isAdmin,
    isDesign,
    isCommercial,
    canEdit: isAdmin || isDesign,
    canExport: isAdmin || isDesign || isCommercial,
    canLoadSave: isAdmin || isDesign, // comercial solo visualiza por ahora
    canSeePrices: isAdmin || isCommercial, // ejemplo: diseño no necesariamente cotiza
  };
}
