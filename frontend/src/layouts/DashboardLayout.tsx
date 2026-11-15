import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  Home,
  User,
  Wallet,
  FilePlus,
  List,
  Package,
  Layers,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'خانه', icon: Home },
  { to: '/requests/new', label: 'ثبت درخواست', icon: FilePlus },
  { to: '/requests', label: 'درخواست‌های من', icon: List },
  { to: '/pool', label: 'استخر پیشنهادها', icon: Layers },
  { to: '/supply', label: 'لیست تأمین', icon: Package },
  { to: '/wallet', label: 'کیف پول', icon: Wallet },
  { to: '/profile', label: 'پروفایل', icon: User },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const primaryBtnClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600 focus:ring-female-300'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600 focus:ring-male-300'
      : 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-300'

  return (
    <div className="min-h-screen bg-calm-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-l border-calm-100 shadow-soft">
        <div className="p-6 border-b border-calm-100">
          <h1 className="text-xl font-bold text-calm-800">مارکت پلتفرم</h1>
          <p className="text-sm text-calm-500 mt-1">
            {user?.first_name || user?.phone || 'کاربر'}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'text-white shadow-soft ' + primaryBtnClass
                    : 'text-calm-600 hover:bg-calm-50'
                )
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-calm-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            خروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-calm-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <h1 className="text-lg font-bold text-calm-800">مارکت پلتفرم</h1>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-calm-50"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-b border-calm-100 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'text-white shadow-soft ' + primaryBtnClass
                      : 'text-calm-600 hover:bg-calm-50'
                  )
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut size={20} />
              خروج
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
