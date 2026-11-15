import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './layouts/DashboardLayout'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import WalletPage from './pages/WalletPage'
import CreateRequestPage from './pages/CreateRequestPage'
import MyRequestsPage from './pages/MyRequestsPage'
import PoolPage from './pages/PoolPage'
import SupplyListPage from './pages/SupplyListPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-calm-50">
        <div className="text-calm-500">در حال بارگذاری...</div>
      </div>
    )
  }

  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="requests/new" element={<CreateRequestPage />} />
        <Route path="requests" element={<MyRequestsPage />} />
        <Route path="pool" element={<PoolPage />} />
        <Route path="supply" element={<SupplyListPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
