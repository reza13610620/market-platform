import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import { FilePlus, Layers, Wallet, Package } from 'lucide-react'

export default function HomePage() {
  const { user } = useAuth()
  const { theme } = useTheme()

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  const softClass =
    theme === 'female'
      ? 'bg-female-50 border-female-100'
      : theme === 'male'
      ? 'bg-male-50 border-male-100'
      : 'bg-teal-50 border-teal-100'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div className={`card p-6 md:p-8 border ${softClass}`}>
        <h1 className="text-2xl md:text-3xl font-bold text-calm-800">
          سلام{user?.first_name ? ` ${user.first_name}` : ''} 👋
        </h1>
        <p className="text-calm-500 mt-2">
          به مارکت پلتفرم خوش آمدید. از اینجا می‌توانید درخواست ثبت کنید یا پیشنهاد بدهید.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/requests/new"
          className="card p-6 hover:shadow-soft-lg transition-all group"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 ${primaryClass}`}>
            <FilePlus size={24} />
          </div>
          <h3 className="font-semibold text-calm-800 group-hover:text-calm-900">ثبت درخواست</h3>
          <p className="text-sm text-calm-500 mt-1">کالای مورد نظرتان را درخواست دهید</p>
        </Link>

        <Link
          to="/pool"
          className="card p-6 hover:shadow-soft-lg transition-all group"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 ${primaryClass}`}>
            <Layers size={24} />
          </div>
          <h3 className="font-semibold text-calm-800">استخر پیشنهادها</h3>
          <p className="text-sm text-calm-500 mt-1">درخواست‌های باز را ببینید و قیمت بدهید</p>
        </Link>

        <Link
          to="/supply"
          className="card p-6 hover:shadow-soft-lg transition-all group"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 ${primaryClass}`}>
            <Package size={24} />
          </div>
          <h3 className="font-semibold text-calm-800">لیست تأمین</h3>
          <p className="text-sm text-calm-500 mt-1">کالاهایی که می‌توانید تأمین کنید</p>
        </Link>

        <Link
          to="/wallet"
          className="card p-6 hover:shadow-soft-lg transition-all group"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 ${primaryClass}`}>
            <Wallet size={24} />
          </div>
          <h3 className="font-semibold text-calm-800">کیف پول</h3>
          <p className="text-sm text-calm-500 mt-1">موجودی و تراکنش‌های شما</p>
        </Link>
      </div>

      {/* Tips */}
      <div className="card p-6">
        <h2 className="font-semibold text-calm-800 mb-3">نکات مهم</h2>
        <ul className="space-y-2 text-sm text-calm-600">
          <li className="flex gap-2">
            <span className="text-teal-500">•</span>
            تا قبل از مشاهده اطلاعات تماس، هویت طرف مقابل مخفی است.
          </li>
          <li className="flex gap-2">
            <span className="text-teal-500">•</span>
            برای دیدن شماره فروشنده از سهمیه پلن خود استفاده می‌شود.
          </li>
          <li className="flex gap-2">
            <span className="text-teal-500">•</span>
            لیست تأمین خود را کامل کنید تا درخواست‌های مرتبط به شما نمایش داده شود.
          </li>
        </ul>
      </div>
    </div>
  )
}
