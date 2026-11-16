import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Board from './pages/Board';
import Dispatch from './pages/Dispatch';
import Merchants from './pages/Merchants';
import OrderDetail from './pages/OrderDetail';

export default function App() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/dispatch" element={<Dispatch />} />
        <Route path="/merchants" element={<Merchants />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}