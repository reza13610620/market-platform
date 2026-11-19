import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  Sparkles,
  TrendingDown,
  ShoppingBag,
  Store,
  Lock,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react'

export default function SmartAssistantPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vipOnly, setVipOnly] = useState(false)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    setLoading(true)
    setError('')
    setVipOnly(false)
    try {
      const res = await fetch('/api/smart/suggestions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.status === 403 || json.code === 'VIP_ONLY') {
        setVipOnly(true)
        return
      }
      if (!res.ok) {
        setError(json.error || 'خطا در دریافت پیشنهادها')
        return
      }
      setData(json.data)
    } catch {
      setError('ارتباط با سرور برقرار نشد')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center text-calm-400 py-20">در حال تحلیل داده‌ها...</div>
  }

  if (vipOnly) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
            <Lock size={28} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-calm-800">دستیار هوشمند</h1>
          <p className="text-sm text-calm-500 leading-relaxed">
            این قابلیت فقط برای پلن‌های <strong>طلایی</strong> و <strong>ویژه</strong> فعال است.
            با ارتقا پلن، پیشنهادهای هوشمند خرید و فروش را دریافت می‌کنید.
          </p>
          <button
            onClick={() => navigate('/plans')}
            className={`btn-primary text-white ${primaryClass}`}
          >
            <Sparkles size={18} />
            مشاهده پلن‌ها
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex gap-3 text-sm text-red-700">
          <AlertCircle size={20} className="shrink-0" />
          {error}
        </div>
      </div>
    )
  }

  const buyerTips = data?.buyer_tips || []
  const sellerTips = data?.seller_tips || []
  const stats = data?.stats || {}

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-calm-800">دستیار هوشمند</h1>
          <p className="text-sm text-calm-400">پیشنهادهای شخصی‌سازی‌شده برای شما</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-calm-800">{stats.open_requests ?? 0}</div>
          <div className="text-xs text-calm-400 mt-1">درخواست باز</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-calm-800">{stats.active_offers ?? 0}</div>
          <div className="text-xs text-calm-400 mt-1">پیشنهاد فعال</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-amber-500">{stats.reputation ?? 80}</div>
          <div className="text-xs text-calm-400 mt-1">امتیاز اعتبار</div>
        </div>
      </div>

      {/* Buyer section */}
      <div className="space-y-3">
        <h2 className="font-semibold text-calm-800 flex items-center gap-2">
          <ShoppingBag size={18} />
          پیشنهاد برای خریدار
        </h2>
        {buyerTips.length === 0 ? (
          <div className="card p-5 text-sm text-calm-400">
            فعلاً پیشنهادی برای خرید ندارید. درخواست جدید ثبت کنید تا قیمت‌ها مقایسه شوند.
          </div>
        ) : (
          buyerTips.map((tip: any, i: number) => (
            <div
              key={i}
              className={`card p-4 ${tip.priority === 'high' ? 'ring-1 ring-amber-200' : ''}`}
            >
              <div className="flex items-start gap-3">
                <TrendingDown size={18} className="text-teal-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-calm-800 text-sm">{tip.title}</div>
                  <p className="text-sm text-calm-500 mt-1 leading-relaxed">{tip.message}</p>
                  {tip.min_price != null && (
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-calm-400">
                      <span>کمینه: {Number(tip.min_price).toLocaleString('fa-IR')}</span>
                      <span>میانگین: {Number(tip.avg_price).toLocaleString('fa-IR')}</span>
                      <span>بیشینه: {Number(tip.max_price).toLocaleString('fa-IR')}</span>
                    </div>
                  )}
                  {tip.request_id && (
                    <button
                      onClick={() => navigate(`/requests/${tip.request_id}/offers`)}
                      className="mt-3 text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      مشاهده پیشنهادها
                      <ArrowLeft size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Seller section */}
      <div className="space-y-3">
        <h2 className="font-semibold text-calm-800 flex items-center gap-2">
          <Store size={18} />
          پیشنهاد برای فروشنده
        </h2>
        {sellerTips.length === 0 ? (
          <div className="card p-5 text-sm text-calm-400">
            فرصت فروشی پیدا نشد. لیست تأمین خود را کامل‌تر کنید تا درخواست‌های مرتبط نشان داده شود.
          </div>
        ) : (
          sellerTips.map((tip: any, i: number) => (
            <div
              key={i}
              className={`card p-4 ${tip.priority === 'high' ? 'ring-1 ring-amber-200' : ''}`}
            >
              <div className="flex items-start gap-3">
                <Store size={18} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-calm-800 text-sm">{tip.title}</div>
                  <p className="text-sm text-calm-500 mt-1 leading-relaxed">{tip.message}</p>
                  {tip.request_id && (
                    <button
                      onClick={() => navigate('/pool')}
                      className="mt-3 text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      برو به استخر
                      <ArrowLeft size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-calm-400 text-center leading-relaxed">
        {data?.note ||
          'این پیشنهادها بر اساس داده‌های فعلی پلتفرم ساخته شده‌اند. نسخه هوشمندتر در آینده اضافه می‌شود.'}
      </p>
    </div>
  )
}
