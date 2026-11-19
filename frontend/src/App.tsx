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
import RequestOffersPage from './pages/RequestOffersPage'
import RequestDetailsPage from './pages/RequestDetailsPage'
import SuggestProductPage from './pages/SuggestProductPage'
import MySuggestionsPage from './pages/MySuggestionsPage'
import AdminProductReviewPage from './pages/AdminProductReviewPage'
import TicketsPage from './pages/TicketsPage'
import TicketDetailsPage from './pages/TicketDetailsPage'
import NotificationsPage from './pages/NotificationsPage'
import PlansPage from './pages/PlansPage'
import MyOrdersPage from './pages/MyOrdersPage'
import SmartAssistantPage from './pages/SmartAssistantPage'
import FavoritesPage from './pages/FavoritesPage'
import AdminTicketsPage from './pages/AdminTicketsPage'

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
        <Route path="requests/:id" element={<RequestDetailsPage />} />
        <Route path="requests/:id/offers" element={<RequestOffersPage />} />
        <Route path="pool" element={<PoolPage />} />
        <Route path="supply" element={<SupplyListPage />} />
        <Route path="products/suggest" element={<SuggestProductPage />} />
        <Route path="products/my-suggestions" element={<MySuggestionsPage />} />
        <Route path="admin/products/review" element={<AdminProductReviewPage />} />
        <Route path="admin/tickets" element={<AdminTicketsPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="orders" element={<MyOrdersPage />} />
        <Route path="smart" element={<SmartAssistantPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
