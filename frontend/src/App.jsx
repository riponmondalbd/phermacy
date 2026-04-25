import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import Dashboard from './pages/dashboard/Dashboard'
import POSPage from './pages/pos/POSPage'
import ProductsPage from './pages/products/ProductsPage'
import PurchasesPage from './pages/purchases/PurchasesPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import CustomersPage from './pages/customers/CustomersPage'
import InventoryPage from './pages/inventory/InventoryPage'
import ReturnsPage from './pages/returns/ReturnsPage'
import ReportsPage from './pages/reports/ReportsPage'
import CashPage from './pages/cash/CashPage'
import SettingsPage from './pages/settings/SettingsPage'
import BackupPage from './pages/backup/BackupPage'
import SalesPage from './pages/sales/SalesPage'
import UsersPage from './pages/users/UsersPage'
import { useAuthStore } from './store/authStore'

function PrivateRoute({ children, roles }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a1d27', color: '#e2e8f0', border: '1px solid #2a2f45', fontSize: '13px' },
          duration: 3500
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="purchases" element={<PurchasesPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="cash" element={<CashPage />} />
          <Route path="settings" element={<PrivateRoute roles={['ADMIN']}><SettingsPage /></PrivateRoute>} />
          <Route path="backup" element={<PrivateRoute roles={['ADMIN','MANAGER']}><BackupPage /></PrivateRoute>} />
          <Route path="users" element={<PrivateRoute roles={['ADMIN']}><UsersPage /></PrivateRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
