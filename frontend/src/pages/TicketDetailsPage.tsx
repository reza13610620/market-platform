import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ArrowRight, Send, XCircle } from 'lucide-react'

export default function TicketDetailsPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setTicket(data.ticket)
        setMessages(data.messages || [])
      } else {
        setError(data.error || 'تیکت یافت نشد')
      }
    } catch {
      setError('خطا در ارتباط')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (newMessage.trim().length < 2) return
    setSending(true)
    try {
      const res = await fetch(`/api/tickets/${id}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: newMessage.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setNewMessage('')
        await fetchDetails()
      } else {
        alert(data.error || 'خطا در ارسال')
      }
    } catch {
      alert('خطا در ارتباط')
    } finally {
      setSending(false)
    }
  }

  const handleClose = async () => {
    if (!confirm('آیا می‌خواهید این تیکت را ببندید؟')) return
    try {
      const res = await fetch(`/api/tickets/${id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        await fetchDetails()
      } else {
        alert(data.error || 'خطا')
      }
    } catch {
      alert('خطا در ارتباط')
    }
  }

  if (loading) {
    return <div className="text-center text-calm-400 py-20">در حال بارگذاری...</div>
  }

  if (error || !ticket) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-calm-500">{error || 'تیکت یافت نشد'}</p>
        <button onClick={() => navigate('/tickets')} className="btn-secondary mt-4">
          بازگشت
        </button>
      </div>
    )
  }

  const isClosed = ticket.status === 'closed'

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button
          onClick={() => navigate('/tickets')}
          className="p-2 rounded-xl hover:bg-calm-100 transition-colors"
        >
          <ArrowRight size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-calm-800 truncate">{ticket.subject}</h1>
          <p className="text-xs text-calm-400 mt-0.5">{ticket.status_label}</p>
        </div>
        {!isClosed && (
          <button
            onClick={handleClose}
            className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
          >
            <XCircle size={14} />
            بستن
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.is_admin
                  ? 'bg-calm-100 text-calm-800 rounded-br-md'
                  : `${primaryClass} text-white rounded-bl-md`
              }`}
            >
              <div className="text-xs opacity-70 mb-1">
                {msg.sender_name} ·{' '}
                {new Date(msg.created_at).toLocaleTimeString('fa-IR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="whitespace-pre-wrap">{msg.message}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isClosed ? (
        <div className="shrink-0 flex gap-2">
          <input
            className="input flex-1"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="پیام خود را بنویسید..."
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || newMessage.trim().length < 2}
            className={`btn-primary text-white px-4 ${primaryClass}`}
          >
            <Send size={18} />
          </button>
        </div>
      ) : (
        <div className="text-center text-sm text-calm-400 py-3">
          این تیکت بسته شده است
        </div>
      )}
    </div>
  )
}
