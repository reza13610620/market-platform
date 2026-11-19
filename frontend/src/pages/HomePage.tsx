import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import { FilePlus, Layers, Wallet, Package, Handshake, Brain } from 'lucide-react'

export default function HomePage() {
  const { user } = useAuth()
  const { theme } = useTheme()

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500'
      : theme === 'male'
      ? 'bg-male-500'
      : 'bg-teal-600'

  const softBg =
    theme === 'female'
      ? 'from-female-50 to-white border-female-100/60'
      : theme === 'male'
      ? 'from-male-50 to-white border-male-100/60'
      : 'from-teal-50 to-white border-teal-100/60'

  const actions = [
    {
      to: '/requests/new',
      icon: FilePlus,
      title: 'ثبت درخواست',
      desc: 'کالای مورد نظرتان را درخواست دهید',
    },
    {
      to: '/pool',
      icon: Layers,
      title: 'استخر پیشنهادها',
      desc: 'درخواست‌های باز را ببینید و قیمت بدهید',
    },
    {
      to: '/orders',
      icon: Handshake,
      title: 'معاملات من',
      desc: 'تکمیل معامله و ثبت امتیاز',
    },
    {
      to: '/smart',
      icon: Brain,
      title: 'دستیار هوشمند',
      desc: 'پیشنهادهای هوشمند خرید و فروش (VIP)',
    },
    {
      to: '/supply',
      icon: Package,
      title: 'لیست تأمین',
      desc: 'کالاهایی که می‌توانید تأمین کنید',
    },
    {
      to: '/wallet',
      icon: Wallet,
      title: 'کیف پول',
      desc: 'موجودی و تراکنش‌های شما',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className={`relative overflow-hidden rounded-3xl border bg-gradient-to-l ${softBg} p-6 md:p-8`}>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold text-calm-800 tracking-tight">
            سلام{user?.first_name ? ` ${user.first_name}` : ''} 👋
          </h1>
          <p className="text-calm-500 mt-2 max-w-lg leading-relaxed">
            به مارکت پلتفرم خوش آمدید. درخواست ثبت کنید یا پیشنهاد قیمت بدهید — نقش شما از روی اقدامتان مشخص می‌شود.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((item) => (
          <Link key={item.to} to={item.to} className="card-hover p-6 group">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4
                          transition-transform duration-300 group-hover:scale-110 ${primaryClass}`}
            >
              <item.icon size={22} strokeWidth={1.8} />
            </div>
            <h3 className="font-semibold text-calm-800 group-hover:text-calm-900 transition-colors">
              {item.title}
            </h3>
            <p className="text-sm text-calm-400 mt-1.5 leading-relaxed">{item.desc}</p>
          </Link>
        ))}
      </div>

      <div className="card p-6 md:p-7">
        <h2 className="font-semibold text-calm-800 mb-4">نکات مهم</h2>
        <ul className="space-y-3 text-sm text-calm-500">
          <li className="flex gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
            <span>تا قبل از مشاهده اطلاعات تماس، هویت طرف مقابل کاملاً مخفی است.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
            <span>برای دیدن شماره فروشنده از سهمیه پلن خود استفاده می‌شود.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
            <span>نیازی به فعال‌سازی نقش فروشنده نیست؛ با ثبت پیشنهاد به‌صورت خودکار فروشنده می‌شوید.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
