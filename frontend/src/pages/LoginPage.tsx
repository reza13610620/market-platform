import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Phone, KeyRound, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const { login } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600 focus:ring-female-300'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600 focus:ring-male-300'
      : 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-300'

  const handleRequestOtp = async () => {
    setError('')
    setMessage('')
    if (!phone || phone.length < 10) {
      setError('شماره موبایل معتبر وارد کنید')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'خطا در ارسال کد')
        return
      }

      setMessage(data.message || 'کد تأیید ارسال شد')
      setStep('otp')
    } catch {
      setError('ارتباط با سرور برقرار نشد')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    if (!code || code.length < 4) {
      setError('کد تأیید را وارد کنید')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'کد نامعتبر است')
        return
      }

      // Fetch full profile
      const meRes = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${data.token}` },
      })
      const meData = await meRes.json()

      if (meRes.ok && meData.data) {
        login(data.token, {
          id: meData.data.id,
          phone: meData.data.phone,
          first_name: meData.data.first_name,
          last_name: meData.data.last_name,
          is_buyer: meData.data.is_buyer,
          is_seller: meData.data.is_seller,
          status: meData.data.status,
        })
      } else {
        login(data.token, {
          id: data.user_id,
          phone,
          first_name: null,
          last_name: null,
          is_buyer: true,
          is_seller: false,
          status: 'active',
        })
      }

      navigate('/')
    } catch {
      setError('ارتباط با سرور برقرار نشد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-calm-50 to-calm-100 p-4">
      <div className="w-full max-w-md">
        {/* Theme Selector */}
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setTheme('female')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              theme === 'female'
                ? 'bg-female-500 text-white shadow-soft'
                : 'bg-white text-calm-600 border border-calm-200'
            }`}
          >
            تم بانوان
          </button>
          <button
            onClick={() => setTheme('male')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              theme === 'male'
                ? 'bg-male-500 text-white shadow-soft'
                : 'bg-white text-calm-600 border border-calm-200'
            }`}
          >
            تم آقایان
          </button>
          <button
            onClick={() => setTheme('neutral')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              theme === 'neutral'
                ? 'bg-teal-600 text-white shadow-soft'
                : 'bg-white text-calm-600 border border-calm-200'
            }`}
          >
            خنثی
          </button>
        </div>

        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-calm-800">ورود به مارکت پلتفرم</h1>
            <p className="text-calm-500 mt-2 text-sm">
              {step === 'phone'
                ? 'شماره موبایل خود را وارد کنید'
                : 'کد تأیید ارسال‌شده را وارد کنید'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 rounded-xl bg-green-50 text-green-700 text-sm text-center">
              {message}
            </div>
          )}

          {step === 'phone' ? (
            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-calm-400" size={20} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  className="input pr-12"
                  dir="ltr"
                />
              </div>

              <button
                onClick={handleRequestOtp}
                disabled={loading}
                className={`btn-primary w-full text-white ${primaryClass}`}
              >
                {loading ? 'در حال ارسال...' : 'دریافت کد تأیید'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 text-calm-400" size={20} />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="کد ۵ رقمی"
                  className="input pr-12 text-center tracking-widest text-lg"
                  maxLength={5}
                  dir="ltr"
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className={`btn-primary w-full text-white ${primaryClass}`}
              >
                {loading ? 'در حال بررسی...' : 'ورود'}
              </button>

              <button
                onClick={() => {
                  setStep('phone')
                  setCode('')
                  setError('')
                  setMessage('')
                }}
                className="btn-secondary w-full"
              >
                <ArrowLeft size={18} />
                تغییر شماره
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-calm-400 mt-6">
          با ورود، قوانین و حریم خصوصی را می‌پذیرید
        </p>
      </div>
    </div>
  )
}
