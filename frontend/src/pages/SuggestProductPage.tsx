import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { PackagePlus, ArrowRight } from 'lucide-react'

export default function SuggestProductPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  const handleSubmit = async () => {
    setError('')
    if (!title.trim() || title.trim().length < 2) {
      setError('عنوان کالا الزامی است')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/products/suggest', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          brand: brand.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'خطا در ثبت پیشنهاد')
        return
      }

      setSuccess(true)
    } catch {
      setError('ارتباط با سرور برقرار نشد')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-5">
        <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
          <PackagePlus size={28} />
        </div>
        <h2 className="text-xl font-bold text-calm-800">پیشنهاد شما ثبت شد</h2>
        <p className="text-sm text-calm-500 leading-relaxed">
          کالای پیشنهادی شما در صف بررسی قرار گرفت.
          نتیجه از طریق اعلان به شما اطلاع داده خواهد شد.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button onClick={() => navigate('/products/my-suggestions')} className="btn-secondary">
            مشاهده پیشنهادهای من
          </button>
          <button onClick={() => navigate('/')} className={`btn-primary text-white ${primaryClass}`}>
            بازگشت به خانه
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-calm-100 transition-colors"
        >
          <ArrowRight size={22} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-calm-800">پیشنهاد کالای جدید</h1>
          <p className="text-sm text-calm-400">کالایی که پیدا نکردید را پیشنهاد دهید</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      <div className="card p-6 space-y-5">
        <div>
          <label className="text-sm text-calm-600 mb-1.5 block">عنوان کالا *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً باتری ماشین پژو ۲۰۶"
          />
        </div>

        <div>
          <label className="text-sm text-calm-600 mb-1.5 block">برند (اختیاری)</label>
          <input
            className="input"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="مثلاً کاسپین"
          />
        </div>

        <div>
          <label className="text-sm text-calm-600 mb-1.5 block">توضیحات بیشتر (اختیاری)</label>
          <textarea
            className="input min-h-[110px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="هر توضیح مفیدی که کمک کند کالا بهتر شناسایی شود..."
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`btn-primary w-full text-white ${primaryClass}`}
        >
          {loading ? 'در حال ثبت...' : 'ثبت پیشنهاد'}
        </button>
      </div>

      <p className="text-xs text-calm-400 text-center leading-relaxed">
        پیشنهاد شما ابتدا بررسی می‌شود و در صورت تأیید به لیست کالاها اضافه خواهد شد.
      </p>
    </div>
  )
}
