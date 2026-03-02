import App from './App.jsx';
import Login from './components/Login.jsx';
import { useAuth } from './auth/AuthContext.jsx';

export default function AppRoot() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
        Cargando...
      </div>
    );
  }

  if (!user) return <Login />;
  return <App />;
}
