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
  X,
  ShieldCheck,
  MessageSquare,
  Bell,
  Sparkles
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'خانه', icon: Home },
  { to: '/requests/new', label: 'ثبت درخواست', icon: FilePlus },
  { to: '/requests', label: 'درخواست‌های من', icon: List },
  { to: '/pool', label: 'استخر پیشنهادها', icon: Layers },
  { to: '/supply', label: 'لیست تأمین', icon: Package },
  { to: '/notifications', label: 'اعلان‌ها', icon: Bell },
  { to: '/tickets', label: 'پشتیبانی', icon: MessageSquare },
  { to: '/plans', label: 'پلن‌ها', icon: Sparkles },
  { to: '/wallet', label: 'کیف پول', icon: Wallet },
  { to: '/profile', label: 'پروفایل', icon: User },
]

const adminItems = [
  { to: '/admin/products/review', label: 'صف بررسی کالا', icon: ShieldCheck },
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

  const activeBg =
    theme === 'female'
      ? 'bg-female-500 text-white shadow-soft'
      : theme === 'male'
      ? 'bg-male-500 text-white shadow-soft'
      : 'bg-teal-600 text-white shadow-soft'

  const activeBgMobile =
    theme === 'female'
      ? 'bg-female-50 text-female-700'
      : theme === 'male'
      ? 'bg-male-50 text-male-700'
      : 'bg-teal-50 text-teal-700'

  return (
    <div className="min-h-screen bg-gradient-to-br from-calm-50 via-white to-calm-50 flex">
      <aside className="hidden lg:flex lg:flex-col w-[260px] bg-white/80 backdrop-blur-xl border-l border-calm-100/60 sticky top-0 h-screen">
        <div className="px-6 py-7 border-b border-calm-100/60">
          <h1 className="text-xl font-bold text-calm-800 tracking-tight">مارکت پلتفرم</h1>
          <p className="text-sm text-calm-400 mt-1 truncate">
            {user?.first_name || user?.phone || 'کاربر عزیز'}
          </p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium',
                  'transition-all duration-300 ease-out',
                  isActive
                    ? activeBg + ' scale-[1.02]'
                    : 'text-calm-500 hover:bg-calm-50 hover:text-calm-700'
                )
              }
            >
              <item.icon size={20} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          ))}

          <div className="pt-4 mt-2 border-t border-calm-100/60">
            <p className="px-4 text-xs text-calm-400 mb-2">مدیریت (موقت)</p>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium',
                    'transition-all duration-300 ease-out',
                    isActive
                      ? activeBg + ' scale-[1.02]'
                      : 'text-calm-500 hover:bg-calm-50 hover:text-calm-700'
                  )
                }
              >
                <item.icon size={20} strokeWidth={1.8} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-calm-100/60">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium
                       text-red-500 hover:bg-red-50 transition-all duration-300"
          >
            <LogOut size={20} strokeWidth={1.8} />
            خروج از حساب
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-calm-100/60 px-4 py-3.5
                           flex items-center justify-between sticky top-0 z-30">
          <h1 className="text-lg font-bold text-calm-800">مارکت پلتفرم</h1>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2.5 rounded-xl hover:bg-calm-50 transition-colors"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        <div
          className={clsx(
            'lg:hidden bg-white border-b border-calm-100 overflow-hidden transition-all duration-300 ease-out',
            mobileOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                    isActive ? activeBgMobile : 'text-calm-500 hover:bg-calm-50'
                  )
                }
              >
                <item.icon size={20} strokeWidth={1.8} />
                {item.label}
              </NavLink>
            ))}
            <div className="pt-2 mt-2 border-t border-calm-100">
              <p className="px-4 text-xs text-calm-400 mb-1">مدیریت (موقت)</p>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                      isActive ? activeBgMobile : 'text-calm-500 hover:bg-calm-50'
                    )
                  }
                >
                  <item.icon size={20} strokeWidth={1.8} />
                  {item.label}
                </NavLink>
              ))}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50"
            >
              <LogOut size={20} strokeWidth={1.8} />
              خروج از حساب
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
