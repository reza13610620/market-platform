import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  CheckCircle,
  XCircle,
  Edit3,
  RefreshCw,
  AlertTriangle,
  Package
} from 'lucide-react'

interface QueueItem {
  id: number
  title: string
  description: string | null
  ai_score: number | null
  ai_result: any
  status: string
  status_label: string
  source: string
  created_at: string
  submitted_by: {
    id: number
    name: string | null
    phone: string | null
  }
  attributes: any
}

export default function AdminProductReviewPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [items, setItems] = useState<QueueItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [noteModal, setNoteModal] = useState<{
    id: number
    type: 'reject' | 'edit'
    title: string
  } | null>(null)
  const [noteText, setNoteText] = useState('')

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  const fetchQueue = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/products/review-queue?status=pending_admin&limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setItems(data.data || [])
        setTotal(data.total || 0)
      } else {
        setError(data.error || 'خطا در دریافت صف')
      }
    } catch {
      setError('ارتباط با سرور برقرار نشد')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  const handleApprove = async (id: number) => {
    if (!confirm('آیا از تأیید این کالا و اضافه شدن به کاتالوگ مطمئن هستید؟')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/products/${id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.success) {
        setItems((prev) => prev.filter((i) => i.id !== id))
        setTotal((t) => Math.max(0, t - 1))
      } else {
        alert(data.error || 'خطا در تأیید')
      }
    } catch {
      alert('خطا در ارتباط')
    } finally {
      setActionLoading(null)
    }
  }

  const openNoteModal = (id: number, type: 'reject' | 'edit', title: string) => {
    setNoteModal({ id, type, title })
    setNoteText('')
  }

  const submitNoteAction = async () => {
    if (!noteModal || noteText.trim().length < 3) {
      alert('توضیح باید حداقل ۳ حرف باشد')
      return
    }
    setActionLoading(noteModal.id)
    const endpoint =
      noteModal.type === 'reject'
        ? `/api/admin/products/${noteModal.id}/reject`
        : `/api/admin/products/${noteModal.id}/request-edit`

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin_note: noteText.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setItems((prev) => prev.filter((i) => i.id !== noteModal.id))
        setTotal((t) => Math.max(0, t - 1))
        setNoteModal(null)
      } else {
        alert(data.error || 'خطا')
      }
    } catch {
      alert('خطا در ارتباط')
    } finally {
      setActionLoading(null)
    }
  }

  const riskColor = (level?: string) => {
    if (level === 'high') return 'bg-red-50 text-red-700'
    if (level === 'medium') return 'bg-amber-50 text-amber-700'
    return 'bg-green-50 text-green-700'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-calm-800">صف بررسی کالا</h1>
          <p className="text-sm text-calm-400 mt-1">
            {total} مورد در انتظار بررسی
          </p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          بروزرسانی
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center text-calm-400 py-20">در حال بارگذاری صف...</div>
      ) : items.length === 0 ? (
        <div className="card p-16 text-center">
          <Package size={40} className="mx-auto text-calm-300 mb-4" />
          <p className="text-calm-500">فعلاً کالایی در صف بررسی نیست</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card p-5 md:p-6 space-y-4">
              {/* Title & Score */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-calm-800 text-lg leading-snug">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-calm-500 mt-1.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.ai_score != null && (
                  <div className="shrink-0 text-center">
                    <div
                      className={`text-2xl font-bold ${
                        item.ai_score >= 70
                          ? 'text-green-600'
                          : item.ai_score >= 45
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {Math.round(item.ai_score)}
                    </div>
                    <div className="text-xs text-calm-400">امتیاز AI</div>
                  </div>
                )}
              </div>

              {/* AI Info */}
              {item.ai_result && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {item.ai_result.risk_level && (
                    <span
                      className={`px-2.5 py-1 rounded-full font-medium ${riskColor(
                        item.ai_result.risk_level
                      )}`}
                    >
                      ریسک: {item.ai_result.risk_level}
                    </span>
                  )}
                  {item.ai_result.is_duplicate && (
                    <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-medium flex items-center gap-1">
                      <AlertTriangle size={12} />
                      احتمال تکراری
                    </span>
                  )}
                  {item.ai_result.exists_externally === false && (
                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium">
                      وجود خارجی تأیید نشد
                    </span>
                  )}
                  {item.ai_result.recommendation && (
                    <span className="px-2.5 py-1 rounded-full bg-calm-50 text-calm-600">
                      پیشنهاد AI: {item.ai_result.recommendation}
                    </span>
                  )}
                </div>
              )}

              {item.ai_result?.issues?.length > 0 && (
                <ul className="text-sm text-calm-500 space-y-1">
                  {item.ai_result.issues.map((issue: string, idx: number) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-amber-500">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              )}

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-calm-400">
                <span>
                  پیشنهاددهنده:{' '}
                  {item.submitted_by?.name || item.submitted_by?.phone || '—'}
                </span>
                <span>
                  {new Date(item.created_at).toLocaleDateString('fa-IR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="capitalize">{item.source}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleApprove(item.id)}
                  disabled={actionLoading === item.id}
                  className={`btn-primary text-white text-sm flex items-center gap-1.5 ${primaryClass}`}
                >
                  <CheckCircle size={16} />
                  تأیید و اضافه به کاتالوگ
                </button>
                <button
                  onClick={() => openNoteModal(item.id, 'edit', item.title)}
                  disabled={actionLoading === item.id}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                >
                  <Edit3 size={16} />
                  درخواست اصلاح
                </button>
                <button
                  onClick={() => openNoteModal(item.id, 'reject', item.title)}
                  disabled={actionLoading === item.id}
                  className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
                >
                  <XCircle size={16} />
                  رد
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-calm-800">
              {noteModal.type === 'reject' ? 'رد پیشنهاد' : 'درخواست اصلاح'}
            </h3>
            <p className="text-sm text-calm-500 line-clamp-1">{noteModal.title}</p>
            <textarea
              className="input min-h-[100px]"
              placeholder={
                noteModal.type === 'reject'
                  ? 'دلیل رد را بنویسید...'
                  : 'توضیح دهید چه چیزی باید اصلاح شود...'
              }
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setNoteModal(null)}
                className="btn-secondary text-sm"
              >
                انصراف
              </button>
              <button
                onClick={submitNoteAction}
                disabled={actionLoading === noteModal.id}
                className={`btn-primary text-white text-sm ${
                  noteModal.type === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : primaryClass
                }`}
              >
                {noteModal.type === 'reject' ? 'رد کردن' : 'ارسال درخواست اصلاح'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
