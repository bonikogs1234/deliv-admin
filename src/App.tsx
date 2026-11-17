import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Board from './pages/Board';
import Dispatch from './pages/Dispatch';
import Rides from './pages/Rides';
import Merchants from './pages/Merchants';
import Couriers from './pages/Couriers';
import Customers from './pages/Customers';
import Zones from './pages/Zones';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Users from './pages/Users';
import OrderDetail from './pages/OrderDetail';

export default function App() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/board" element={<Board />} />
        <Route path="/dispatch" element={<Dispatch />} />
        <Route path="/rides" element={<Rides />} />
        <Route path="/merchants" element={<Merchants />} />
        <Route path="/couriers" element={<Couriers />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/zones" element={<Zones />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/users" element={<Users />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}