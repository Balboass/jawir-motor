import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://oxiuxhkuxodqqewxmzgs.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aXV4aGt1eG9kcXFld3htemdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzQ5MzksImV4cCI6MjA3NTg1MDkzOX0._uJGPod-fH2z-VBf8pI5GkNGLoqMnrrwI5cYgsdeGXM'
)

function BotControl() {
  const navigate = useNavigate()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [duration, setDuration] = useState(30) // minutes (default 30 minutes)
  const [activeControls, setActiveControls] = useState([])
  const [blockedNumbers, setBlockedNumbers] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if logged in
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
      navigate('/admin')
      return
    }

    fetchActiveControls()
    fetchBlockedNumbers()
  }, [navigate])

  const fetchActiveControls = async () => {
    try {
      const { data } = await supabase
        .from('bot_settings')
        .select('*')
        .not('cooldown_until', 'is', null)
        .order('cooldown_until', { ascending: false })

      const now = new Date()
      const active = data?.filter(item => {
        return new Date(item.cooldown_until) > now
      }) || []

      setActiveControls(active)
    } catch (error) {
      console.error('Error fetching controls:', error)
    }
  }

  const fetchBlockedNumbers = async () => {
    try {
      const { data } = await supabase
        .from('blocked_numbers')
        .select('*')
        .order('created_at', { ascending: false })

      setBlockedNumbers(data || [])
    } catch (error) {
      console.error('Error fetching blocked numbers:', error)
    }
  }

  const pauseBot = async () => {
    if (!phoneNumber.trim()) {
      setMessage('❌ Masukkan nomor telepon!')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Format phone number (remove +, spaces, etc)
      let formattedPhone = phoneNumber.replace(/[\s\-\+]/g, '')

      // Add 62 if starts with 0
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1)
      }

      const now = new Date()
      const cooldownUntil = new Date(Date.now() + duration * 60 * 1000)

      const { error } = await supabase
        .from('bot_settings')
        .upsert({
          customer_phone: formattedPhone,
          cooldown_until: cooldownUntil.toISOString(),
          last_manual_reply: now.toISOString(),
          has_greeted: false
        }, {
          onConflict: 'customer_phone'
        })

      if (error) {
        setMessage(`❌ Error: ${error.message}`)
      } else {
        setMessage(`✅ Bot dijeda untuk ${formattedPhone} selama ${duration} menit`)
        setPhoneNumber('')
        fetchActiveControls()
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const resumeBot = async (phone) => {
    try {
      const { error } = await supabase
        .from('bot_settings')
        .update({
          cooldown_until: null
        })
        .eq('customer_phone', phone)

      if (error) {
        setMessage(`❌ Error: ${error.message}`)
      } else {
        setMessage(`✅ Bot dilanjutkan untuk ${phone}`)
        fetchActiveControls()
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    }
  }

  const blockPermanently = async () => {
    if (!phoneNumber.trim()) {
      setMessage('❌ Masukkan nomor telepon!')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Format phone number
      let formattedPhone = phoneNumber.replace(/[\s\-\+]/g, '')
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1)
      }

      const { error } = await supabase
        .from('blocked_numbers')
        .upsert({
          phone_number: formattedPhone,
          blocked_by: 'admin'
        }, {
          onConflict: 'phone_number'
        })

      if (error) {
        setMessage(`❌ Error: ${error.message}`)
      } else {
        setMessage(`✅ Nomor ${formattedPhone} diblokir permanen`)
        setPhoneNumber('')
        fetchBlockedNumbers()
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const unblockNumber = async (phone) => {
    try {
      const { error } = await supabase
        .from('blocked_numbers')
        .delete()
        .eq('phone_number', phone)

      if (error) {
        setMessage(`❌ Error: ${error.message}`)
      } else {
        setMessage(`✅ Nomor ${phone} dibuka kembali`)
        fetchBlockedNumbers()
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    }
  }

  const formatTimeRemaining = (cooldownUntil) => {
    const now = new Date()
    const until = new Date(cooldownUntil)
    const diffMs = until - now
    const diffMins = Math.ceil(diffMs / 60000)

    if (diffMins < 1) return 'Selesai'
    if (diffMins < 60) return `${diffMins} menit lagi`

    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours} jam ${mins} menit lagi`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">🎮 Bot Control</h1>
              <p className="text-sm text-blue-300">Pause/Resume Bot untuk Customer Tertentu</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                ← Dashboard
              </button>
              <button
                onClick={() => {
                  fetchActiveControls()
                  fetchBlockedNumbers()
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Control Panel */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700 mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Jeda Bot untuk Customer</h3>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nomor Telepon Customer
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="08123456789 atau 628123456789"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Durasi Jeda
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 menit</option>
                <option value={30}>30 menit</option>
                <option value={60}>1 jam</option>
                <option value={120}>2 jam</option>
                <option value={180}>3 jam</option>
                <option value={360}>6 jam</option>
                <option value={720}>12 jam</option>
                <option value={1440}>24 jam</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={pauseBot}
              disabled={loading}
              className="bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-orange-700 hover:to-red-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : '⏸️ Jeda Bot'}
            </button>

            <button
              onClick={blockPermanently}
              disabled={loading}
              className="bg-gradient-to-r from-red-700 to-red-900 text-white font-semibold py-3 px-4 rounded-lg hover:from-red-800 hover:to-red-950 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : '🚫 Blokir Permanen'}
            </button>
          </div>

          {message && (
            <div className={`mt-4 p-4 rounded-lg ${
              message.startsWith('✅')
                ? 'bg-green-900/50 border border-green-500 text-green-300'
                : 'bg-red-900/50 border border-red-500 text-red-300'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-blue-900 to-cyan-900 rounded-xl p-6 shadow-xl border-2 border-blue-500 mb-8">
          <div className="flex items-start space-x-4">
            <div className="text-4xl">💡</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">Cara Menggunakan</h3>
              <ul className="text-blue-100 space-y-2 text-sm">
                <li>⏸️ <strong>Jeda Sementara:</strong> Pilih durasi (15 menit - 24 jam), klik "Jeda Bot" - Bot akan otomatis aktif lagi setelah waktu habis</li>
                <li>🚫 <strong>Blokir Permanen:</strong> Klik "Blokir Permanen" - Bot tidak akan pernah merespon nomor tersebut sampai Anda buka blokirnya</li>
                <li>🔓 <strong>Buka Blokir:</strong> Lihat daftar nomor yang diblokir di bawah, klik "Buka Blokir" untuk mengaktifkan bot lagi</li>
                <li>📝 <strong>Catatan:</strong> Customer juga bisa ketik "jawir88" untuk menonaktifkan bot sendiri</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Active Controls */}
        <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-xl font-bold text-white">Customer yang Sedang Dijeda</h3>
            <p className="text-gray-400 text-sm mt-1">
              Total: {activeControls.length} customer
            </p>
          </div>

          {activeControls.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Tidak ada customer yang sedang dijeda
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Nomor Telepon</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Sisa Waktu</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Jeda Sampai</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {activeControls.map((control) => (
                    <tr key={control.customer_phone} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-4 text-white font-semibold">
                        {control.customer_phone}
                      </td>
                      <td className="py-3 px-4 text-orange-400 font-semibold">
                        {formatTimeRemaining(control.cooldown_until)}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(control.cooldown_until).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => resumeBot(control.customer_phone)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          ▶️ Resume
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Permanently Blocked Numbers */}
        <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 mt-8">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-xl font-bold text-white">Nomor yang Diblokir Permanen</h3>
            <p className="text-gray-400 text-sm mt-1">
              Total: {blockedNumbers.length} nomor
            </p>
          </div>

          {blockedNumbers.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Tidak ada nomor yang diblokir permanen
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Nomor Telepon</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Diblokir Oleh</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Tanggal Blokir</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedNumbers.map((blocked) => (
                    <tr key={blocked.phone_number} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-4 text-white font-semibold">
                        {blocked.phone_number}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {blocked.blocked_by === 'admin' ? '👨‍💼 Admin' :
                         blocked.blocked_by === 'mechanic' ? '👨‍🔧 Mechanic' :
                         '👤 Customer'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(blocked.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            if (confirm(`Yakin ingin membuka blokir untuk ${blocked.phone_number}?`)) {
                              unblockNumber(blocked.phone_number)
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          🔓 Buka Blokir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BotControl
