import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Initialize Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://oxiuxhkuxodqqewxmzgs.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aXV4aGt1eG9kcXFld3htemdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzQ5MzksImV4cCI6MjA3NTg1MDkzOX0._uJGPod-fH2z-VBf8pI5GkNGLoqMnrrwI5cYgsdeGXM'
)

const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalMessages: 0,
    uniqueCustomers: 0,
    blockedNumbers: 0,
    todayMessages: 0
  })
  const [messagesPerDay, setMessagesPerDay] = useState([])
  const [topProblems, setTopProblems] = useState([])
  const [recentConversations, setRecentConversations] = useState([])
  const [peakHours, setPeakHours] = useState([])
  const [peakDays, setPeakDays] = useState([])
  const [priceAlerts, setPriceAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if logged in
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
      navigate('/admin')
      return
    }

    fetchAnalytics()
  }, [navigate])

  const fetchAnalytics = async () => {
    try {
      // Fetch total messages
      const { count: totalCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })

      // Fetch unique customers
      const { data: customers } = await supabase
        .from('conversations')
        .select('customer_phone')

      const uniqueCustomers = new Set(customers?.map(c => c.customer_phone)).size

      // Fetch blocked numbers count
      const { count: blockedCount } = await supabase
        .from('blocked_numbers')
        .select('*', { count: 'exact', head: true })

      // Fetch today's messages
      const today = new Date().toISOString().split('T')[0]
      const { count: todayCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)

      setStats({
        totalMessages: totalCount || 0,
        uniqueCustomers,
        blockedNumbers: blockedCount || 0,
        todayMessages: todayCount || 0
      })

      // Fetch messages per day (last 7 days)
      const { data: dailyData } = await supabase
        .from('conversations')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })

      const dayGroups = {}
      dailyData?.forEach(item => {
        const date = new Date(item.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
        dayGroups[date] = (dayGroups[date] || 0) + 1
      })

      const chartData = Object.entries(dayGroups).map(([date, count]) => ({
        date,
        messages: count
      }))
      setMessagesPerDay(chartData)

      // Analyze top problems from messages
      const { data: messages } = await supabase
        .from('conversations')
        .select('message')
        .limit(1000)

      const problemKeywords = {
        'Susah Hidup': ['susah hidup', 'ga hidup', 'gak hidup', 'tidak hidup', 'ga mau hidup', 'mati'],
        'Rem Berisik': ['rem', 'berisik', 'bunyi', 'suara'],
        'Oli Bocor': ['oli', 'bocor', 'rembes'],
        'Mesin Overheat': ['panas', 'overheat', 'suhu tinggi'],
        'Rantai Kendor': ['rantai', 'kendor', 'longgat'],
        'Lainnya': []
      }

      const problemCounts = {}
      messages?.forEach(({ message }) => {
        const text = message.toLowerCase()
        let foundProblem = false

        for (const [problem, keywords] of Object.entries(problemKeywords)) {
          if (problem === 'Lainnya') continue
          if (keywords.some(keyword => text.includes(keyword))) {
            problemCounts[problem] = (problemCounts[problem] || 0) + 1
            foundProblem = true
            break
          }
        }

        if (!foundProblem) {
          problemCounts['Lainnya'] = (problemCounts['Lainnya'] || 0) + 1
        }
      })

      const problemData = Object.entries(problemCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)

      setTopProblems(problemData)

      // Fetch recent conversations
      const { data: recent } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentConversations(recent || [])

      // Fetch all conversations for time analysis
      const { data: allConversations } = await supabase
        .from('conversations')
        .select('created_at, message, bot_reply')
        .order('created_at', { ascending: false })
        .limit(1000)

      // Analyze peak hours (0-23)
      const hourCounts = {}
      allConversations?.forEach(conv => {
        const hour = new Date(conv.created_at).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      })

      const hourData = Object.entries(hourCounts)
        .map(([hour, count]) => ({
          hour: `${hour.padStart(2, '0')}:00`,
          messages: count
        }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))

      setPeakHours(hourData)

      // Analyze peak days (0=Sunday, 6=Saturday)
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      const dayCounts = {}
      allConversations?.forEach(conv => {
        const day = new Date(conv.created_at).getDay()
        const dayName = dayNames[day]
        dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
      })

      const dayData = dayNames.map(day => ({
        day,
        messages: dayCounts[day] || 0
      }))

      setPeakDays(dayData)

      // Analyze price mentions for transparency
      const priceRegex = /(?:rp|Rp|RP|harga|biaya|kena)\s*\.?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:ribu|rb|k)?/gi
      const priceMatches = []

      allConversations?.forEach(conv => {
        const text = `${conv.message} ${conv.bot_reply || ''}`
        let match
        while ((match = priceRegex.exec(text)) !== null) {
          const priceStr = match[1].replace(/[.,]/g, '')
          let price = parseInt(priceStr)

          // Check if it's in thousands (ribu/rb/k)
          if (match[0].toLowerCase().includes('ribu') ||
              match[0].toLowerCase().includes('rb') ||
              match[0].toLowerCase().includes('k')) {
            price *= 1000
          }

          // Only track prices between 10k and 10M (reasonable service prices)
          if (price >= 10000 && price <= 10000000) {
            priceMatches.push({
              price,
              context: match[0],
              date: new Date(conv.created_at).toLocaleDateString('id-ID'),
              fullText: text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 100))
            })
          }
        }
      })

      // Group by price ranges
      const priceRanges = {
        '10k-50k': priceMatches.filter(p => p.price >= 10000 && p.price < 50000).length,
        '50k-100k': priceMatches.filter(p => p.price >= 50000 && p.price < 100000).length,
        '100k-200k': priceMatches.filter(p => p.price >= 100000 && p.price < 200000).length,
        '200k-500k': priceMatches.filter(p => p.price >= 200000 && p.price < 500000).length,
        '500k+': priceMatches.filter(p => p.price >= 500000).length
      }

      const priceData = Object.entries(priceRanges).map(([range, count]) => ({
        range,
        count
      })).filter(item => item.count > 0)

      setPriceAlerts(priceData)

      setLoading(false)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminLoggedIn')
    navigate('/admin')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">JAWIR MOTOR</h1>
              <p className="text-sm text-blue-300">Analytics Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/prices')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-semibold"
              >
                💰 Price Monitoring
              </button>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-xl">
            <div className="text-blue-100 text-sm mb-1">Total Pesan</div>
            <div className="text-white text-3xl font-bold">{stats.totalMessages}</div>
          </div>

          <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-6 shadow-xl">
            <div className="text-cyan-100 text-sm mb-1">Pelanggan Unik</div>
            <div className="text-white text-3xl font-bold">{stats.uniqueCustomers}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-xl">
            <div className="text-purple-100 text-sm mb-1">Pesan Hari Ini</div>
            <div className="text-white text-3xl font-bold">{stats.todayMessages}</div>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-6 shadow-xl">
            <div className="text-red-100 text-sm mb-1">Nomor Diblokir</div>
            <div className="text-white text-3xl font-bold">{stats.blockedNumbers}</div>
          </div>
        </div>

        {/* Peak Time Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Peak Hours */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">📊 Jam Paling Ramai</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="hour" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="messages" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Days */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">📅 Hari Paling Ramai</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakDays}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="messages" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Price Transparency Section */}
        {priceAlerts.length > 0 && (
          <div className="bg-gradient-to-r from-amber-900 to-orange-900 rounded-xl p-6 shadow-xl border-2 border-amber-500 mb-8">
            <div className="flex items-start space-x-4">
              <div className="text-4xl">💰</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">Transparansi Harga</h3>
                <p className="text-amber-100 mb-4">
                  Sistem mendeteksi harga yang disebutkan dalam percakapan. Gunakan ini untuk memastikan harga yang diberikan ke customer konsisten.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {priceAlerts.map((item, idx) => (
                    <div key={idx} className="bg-slate-900/50 rounded-lg p-4 border border-amber-700">
                      <div className="text-amber-300 text-sm font-semibold">{item.range}</div>
                      <div className="text-white text-2xl font-bold">{item.count}x</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-amber-950/50 rounded-lg p-4 border border-amber-800">
                  <p className="text-amber-200 text-sm">
                    💡 <strong>Tips Anti-Korupsi:</strong> Bandingkan harga ini dengan nota/struk yang sebenarnya.
                    Jika ada perbedaan besar, bisa jadi ada ketidaksesuaian harga antara yang dikasih tau ke customer vs yang dibayar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Messages per Day */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Pesan Per Hari (7 Hari Terakhir)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={messagesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Line type="monotone" dataKey="messages" stroke="#3b82f6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Problems */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Masalah Terpopuler</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProblems}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {topProblems.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4">Percakapan Terbaru</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Waktu</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Nama</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Telepon</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Pesan</th>
                </tr>
              </thead>
              <tbody>
                {recentConversations.map((conv) => (
                  <tr key={conv.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(conv.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 text-white">{conv.customer_name || '-'}</td>
                    <td className="py-3 px-4 text-gray-300">{conv.customer_phone}</td>
                    <td className="py-3 px-4 text-gray-300 max-w-md truncate">
                      {conv.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
