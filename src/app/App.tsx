import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { NotifProvider } from '@/app/providers/NotifProvider';
import Layout from '@/components/layout/DashboardLayout/DashboardLayout';
import Login from '@/features/auth/components/LoginPage';
import Dashboard from '@/features/crm/components/DashboardPage';
import ContactsList from '@/features/crm/components/ContactsList';
import ContactDetail from '@/features/crm/components/ContactDetail';
import Pipeline from '@/features/crm/components/Pipeline';
import Visites from '@/features/crm/components/Visites';
import Historique from '@/features/crm/components/Historique';
import Relances from '@/features/crm/components/Relances';
import Agents from '@/features/crm/components/Agents';
import Rapports from '@/features/crm/components/Rapports';

import { ProtectedRoute } from '@/router';
import { QueryProvider } from '@/app/providers/QueryProvider';

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <NotifProvider>
          <BrowserRouter>
            <Routes>
              {/* Route publique */}
              <Route path="/login" element={<Login />} />

              {/* Routes protégées */}
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
    </QueryProvider>
  );
}

export default App;
