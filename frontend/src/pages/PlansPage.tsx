import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Check, Sparkles } from 'lucide-react'

export default function PlansPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [plans, setPlans] = useState<any[]>([])
  const [current, setCurrent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  useEffect(() => {
    Promise.all([
      fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/subscription/me', { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.json()
      ),
    ]).then(([plansData, subData]) => {
      if (plansData.success) setPlans(plansData.data || [])
      if (subData.success) setCurrent(subData.data)
      setLoading(false)
    })
  }, [])

  const handleUpgrade = async (code: string) => {
    if (!confirm(`آیا می‌خواهید پلن «${code}» را فعال کنید؟\n(فعلاً پرداخت شبیه‌سازی می‌شود)`)) return
    setUpgrading(code)
    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_code: code }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        const subRes = await fetch('/api/subscription/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const subData = await subRes.json()
        if (subData.success) setCurrent(subData.data)
      } else {
        alert(data.error || 'خطا')
      }
    } finally {
      setUpgrading(null)
    }
  }

  if (loading) {
    return <div className="text-center text-calm-400 py-20">در حال بارگذاری...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-calm-800">پلن‌ها و ارتقا</h1>
        <p className="text-sm text-calm-400 mt-1">
          پلن فعلی شما: <strong>{current?.plan_title || 'رایگان'}</strong>
          {current?.contact_view_quota != null && (
            <> · سهمیه ماهانه: {current.contact_view_quota === null ? 'نامحدود' : current.contact_view_quota}</>
          )}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const isCurrent = current?.plan_code === plan.code
          return (
            <div
              key={plan.code}
              className={`card p-5 space-y-4 ${isCurrent ? 'ring-2 ring-teal-400' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-calm-800 text-lg">{plan.title}</h2>
                {isCurrent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                    فعلی
                  </span>
                )}
              </div>

              <div className="text-2xl font-bold text-calm-800">
                {plan.price_monthly === 0
                  ? 'رایگان'
                  : `${Number(plan.price_monthly).toLocaleString('fa-IR')} تومان`}
                {plan.price_monthly > 0 && (
                  <span className="text-sm font-normal text-calm-400"> / ماه</span>
                )}
              </div>

              <ul className="space-y-2 text-sm text-calm-600">
                <li className="flex items-center gap-2">
                  <Check size={15} className="text-teal-500" />
                  سهمیه مشاهده:{' '}
                  {plan.contact_view_quota === null
                    ? 'نامحدود'
                    : `${plan.contact_view_quota} بار در ماه`}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={15} className="text-teal-500" />
                  درخواست فعال:{' '}
                  {plan.max_active_requests === null
                    ? 'نامحدود'
                    : plan.max_active_requests}
                </li>
                {plan.features?.priority_support && (
                  <li className="flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-500" />
                    پشتیبانی اولویت‌دار
                  </li>
                )}
              </ul>

              {!isCurrent && !plan.is_free && (
                <button
                  onClick={() => handleUpgrade(plan.code)}
                  disabled={upgrading === plan.code}
                  className={`btn-primary w-full text-white ${primaryClass}`}
                >
                  {upgrading === plan.code ? '...' : 'ارتقا به این پلن'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-calm-400 text-center">
        پرداخت واقعی در نسخه بعدی فعال می‌شود. فعلاً ارتقا به صورت آزمایشی است.
      </p>
    </div>
  )
}
