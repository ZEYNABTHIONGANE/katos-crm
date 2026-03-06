import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotifProvider } from './contexts/NotifContext';
import type { ReactNode } from 'react';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContactsList from './pages/ContactsList';
import ContactDetail from './pages/ContactDetail';
import Pipeline from './pages/Pipeline';
import Visites from './pages/Visites';
import Historique from './pages/Historique';
import Relances from './pages/Relances';
import Agents from './pages/Agents';
import Rapports from './pages/Rapports';
import './App.css';
import './pages/Dashboard.css';

// Guard — redirige vers /login si non connecté
const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <NotifProvider>
        <BrowserRouter>
          <Routes>
            {/* Route publique */}
            <Route path="/login" element={<Login />} />

            {/* Routes protégées */}
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="prospects" element={<ContactsList />} />
              <Route path="prospects/:id" element={<ContactDetail />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="relances" element={<Relances />} />
              <Route path="agents" element={<Agents />} />
              <Route path="rapports" element={<Rapports />} />
              <Route path="visites" element={<Visites />} />
              <Route path="historique" element={<Historique />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotifProvider>
    </AuthProvider>
  );
}

export default App;
