import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ArrowRight, PackagePlus, Clock } from 'lucide-react'

const statusStyles: Record<string, string> = {
  pending_ai: 'bg-amber-50 text-amber-700',
  pending_admin: 'bg-blue-50 text-blue-700',
  needs_edit: 'bg-orange-50 text-orange-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

export default function MySuggestionsPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  useEffect(() => {
    fetchList()
  }, [])

  const fetchList = async () => {
    try {
      const res = await fetch('/api/products/my-suggestions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setList(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-calm-100 transition-colors"
          >
            <ArrowRight size={22} />
          </button>
          <h1 className="text-xl font-bold text-calm-800">پیشنهادهای کالای من</h1>
        </div>

        <Link to="/products/suggest" className={`btn-primary text-white text-sm ${primaryClass}`}>
          <PackagePlus size={16} />
          پیشنهاد جدید
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-calm-400 py-16">در حال بارگذاری...</div>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-calm-400 text-sm">هنوز کالایی پیشنهاد نداده‌اید</div>
          <Link to="/products/suggest" className="btn-secondary mt-4 inline-flex text-sm">
            ثبت اولین پیشنهاد
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <div key={item.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-calm-800">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-calm-500 mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-calm-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.created_at).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                    statusStyles[item.status] || 'bg-calm-100 text-calm-600'
                  }`}
                >
                  {item.status_label}
                </span>
              </div>

              {item.admin_note && (
                <div className="mt-3 p-3 rounded-xl bg-calm-50 text-sm text-calm-600">
                  {item.admin_note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
