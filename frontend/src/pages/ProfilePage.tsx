import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { User, MapPin, Edit3, Save } from 'lucide-react'

export default function ProfilePage() {
  const { token } = useAuth()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', city_name: '', bio: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const primaryClass =
    theme === 'female'
      ? 'bg-female-500 hover:bg-female-600'
      : theme === 'male'
      ? 'bg-male-500 hover:bg-male-600'
      : 'bg-teal-600 hover:bg-teal-700'

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setProfile(data.data)
        setForm({
          first_name: data.data.first_name || '',
          last_name: data.data.last_name || '',
          city_name: data.data.profile?.city_name || '',
          bio: data.data.profile?.bio || '',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setProfile(data.data)
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center text-calm-500 py-20">در حال بارگذاری...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-calm-800">پروفایل من</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary">
            <Edit3 size={18} />
            ویرایش
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving} className={`btn-primary text-white ${primaryClass}`}>
            <Save size={18} />
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
        )}
      </div>

      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${primaryClass}`}>
            {(profile?.first_name?.[0] || profile?.phone?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-lg text-calm-800">
              {profile?.first_name || profile?.last_name
                ? `${profile.first_name || ''} ${profile.last_name || ''}`
                : 'بدون نام'}
            </div>
            <div className="text-sm text-calm-500" dir="ltr">{profile?.phone}</div>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4 pt-4 border-t border-calm-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-calm-600 mb-1 block">نام</label>
                <input
                  className="input"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-calm-600 mb-1 block">نام خانوادگی</label>
                <input
                  className="input"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-calm-600 mb-1 block">شهر</label>
              <input
                className="input"
                value={form.city_name}
                onChange={(e) => setForm({ ...form, city_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-calm-600 mb-1 block">درباره من</label>
              <textarea
                className="input min-h-[100px]"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-4 border-t border-calm-100 text-sm">
            <div className="flex items-center gap-2 text-calm-600">
              <MapPin size={16} />
              {profile?.profile?.city_name || 'شهر مشخص نشده'}
            </div>
            {profile?.profile?.bio && (
              <p className="text-calm-600">{profile.profile.bio}</p>
            )}
            <div className="flex gap-4 pt-2">
              <div className="text-calm-500">
                امتیاز اعتبار:{' '}
                <span className="font-semibold text-calm-800">
                  {profile?.profile?.reputation_score ?? 80}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Theme Selection */}
      <div className="card p-6">
        <h2 className="font-semibold text-calm-800 mb-4">تم ظاهری</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setTheme('female')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              theme === 'female'
                ? 'bg-female-500 text-white shadow-soft'
                : 'bg-calm-50 text-calm-600 border border-calm-200'
            }`}
          >
            تم بانوان
          </button>
          <button
            onClick={() => setTheme('male')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              theme === 'male'
                ? 'bg-male-500 text-white shadow-soft'
                : 'bg-calm-50 text-calm-600 border border-calm-200'
            }`}
          >
            تم آقایان
          </button>
          <button
            onClick={() => setTheme('neutral')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              theme === 'neutral'
                ? 'bg-teal-600 text-white shadow-soft'
                : 'bg-calm-50 text-calm-600 border border-calm-200'
            }`}
          >
            تم خنثی
          </button>
        </div>
      </div>
    </div>
  )
}
