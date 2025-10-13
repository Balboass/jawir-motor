import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://oxiuxhkuxodqqewxmzgs.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aXV4aGt1eG9kcXFld3htemdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzQ5MzksImV4cCI6MjA3NTg1MDkzOX0._uJGPod-fH2z-VBf8pI5GkNGLoqMnrrwI5cYgsdeGXM'
)

function PriceMonitoring() {
  const navigate = useNavigate()
  const [priceData, setPriceData] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    avgPrice: 0,
    minPrice: 0,
    maxPrice: 0
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, today, week, month

  useEffect(() => {
    // Check if logged in
    if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
      navigate('/admin')
      return
    }

    fetchPrices()
  }, [navigate, filter])

  const fetchPrices = async () => {
    try {
      setLoading(true)

      // Determine date filter
      let dateFilter = new Date(0) // Beginning of time
      if (filter === 'today') {
        dateFilter = new Date()
        dateFilter.setHours(0, 0, 0, 0)
      } else if (filter === 'week') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      } else if (filter === 'month') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }

      // Fetch conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .gte('created_at', dateFilter.toISOString())
        .order('created_at', { ascending: false })

      // Extract prices from conversations
      const priceRegex = /(?:rp|Rp|RP|harga|biaya|kena|charge)\s*\.?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:ribu|rb|k|juta)?/gi
      const extractedPrices = []

      conversations?.forEach(conv => {
        const combinedText = `${conv.message} ${conv.bot_reply || ''}`
        let match

        while ((match = priceRegex.exec(combinedText)) !== null) {
          const priceStr = match[1].replace(/[.,]/g, '')
          let price = parseInt(priceStr)

          // Check if it's in thousands
          const fullMatch = match[0].toLowerCase()
          if (fullMatch.includes('ribu') || fullMatch.includes('rb') || fullMatch.includes('k')) {
            price *= 1000
          } else if (fullMatch.includes('juta')) {
            price *= 1000000
          }

          // Only track reasonable prices (10k - 10M)
          if (price >= 10000 && price <= 10000000) {
            // Find which message (customer or bot) contains the price
            const fromCustomer = conv.message.toLowerCase().includes(match[0].toLowerCase())
            const fromBot = conv.bot_reply?.toLowerCase().includes(match[0].toLowerCase())

            extractedPrices.push({
              id: `${conv.id}-${match.index}`,
              price,
              priceFormatted: new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
              }).format(price),
              context: match[0],
              fullMessage: combinedText.substring(
                Math.max(0, match.index - 80),
                Math.min(combinedText.length, match.index + 150)
              ),
              customerPhone: conv.customer_phone,
              customerName: conv.customer_name || 'Unknown',
              date: new Date(conv.created_at).toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              timestamp: new Date(conv.created_at).getTime(),
              source: fromCustomer ? 'customer' : fromBot ? 'bot/mechanic' : 'unknown'
            })
          }
        }
      })

      // Sort by most recent
      extractedPrices.sort((a, b) => b.timestamp - a.timestamp)

      // Calculate statistics
      if (extractedPrices.length > 0) {
        const prices = extractedPrices.map(p => p.price)
        const total = extractedPrices.length
        const sum = prices.reduce((a, b) => a + b, 0)
        const avg = Math.round(sum / total)
        const min = Math.min(...prices)
        const max = Math.max(...prices)

        setStats({
          total,
          avgPrice: avg,
          minPrice: min,
          maxPrice: max
        })
      } else {
        setStats({ total: 0, avgPrice: 0, minPrice: 0, maxPrice: 0 })
      }

      setPriceData(extractedPrices)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching prices:', error)
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
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
              <h1 className="text-2xl font-bold text-white">💰 Price Monitoring</h1>
              <p className="text-sm text-blue-300">Transparansi Harga & Anti-Korupsi</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                ← Dashboard
              </button>
              <button
                onClick={fetchPrices}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            7 Hari
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            30 Hari
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-xl">
            <div className="text-blue-100 text-sm mb-1">Total Harga Disebutkan</div>
            <div className="text-white text-3xl font-bold">{stats.total}</div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 shadow-xl">
            <div className="text-green-100 text-sm mb-1">Rata-rata Harga</div>
            <div className="text-white text-2xl font-bold">{formatCurrency(stats.avgPrice)}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 shadow-xl">
            <div className="text-orange-100 text-sm mb-1">Harga Terendah</div>
            <div className="text-white text-2xl font-bold">{formatCurrency(stats.minPrice)}</div>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-6 shadow-xl">
            <div className="text-red-100 text-sm mb-1">Harga Tertinggi</div>
            <div className="text-white text-2xl font-bold">{formatCurrency(stats.maxPrice)}</div>
          </div>
        </div>

        {/* Warning Box */}
        <div className="bg-gradient-to-r from-amber-900 to-orange-900 rounded-xl p-6 shadow-xl border-2 border-amber-500 mb-8">
          <div className="flex items-start space-x-4">
            <div className="text-4xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">Cara Menggunakan Price Monitoring</h3>
              <ul className="text-amber-100 space-y-2 text-sm">
                <li>✅ <strong>Bandingkan dengan struk/nota:</strong> Cek apakah harga yang disebutkan ke customer sama dengan yang dibayar</li>
                <li>✅ <strong>Perhatikan sumber:</strong> Harga dari "customer" biasanya pertanyaan, dari "bot/mechanic" adalah jawaban resmi</li>
                <li>✅ <strong>Cari pola:</strong> Jika sering ada harga berbeda untuk service yang sama, bisa jadi ada masalah</li>
                <li>⚠️ <strong>Tips:</strong> Screenshot percakapan yang mencurigakan sebagai bukti</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Price List */}
        <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-xl font-bold text-white">Daftar Harga yang Disebutkan</h3>
            <p className="text-gray-400 text-sm mt-1">
              Total: {stats.total} harga ditemukan
            </p>
          </div>

          {priceData.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Tidak ada harga yang disebutkan dalam periode ini
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Tanggal</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Harga</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Sumber</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Customer</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Konteks Percakapan</th>
                  </tr>
                </thead>
                <tbody>
                  {priceData.map((item) => (
                    <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-4 text-gray-400 text-sm whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-3 px-4 text-green-400 font-bold text-lg whitespace-nowrap">
                        {item.priceFormatted}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.source === 'customer'
                            ? 'bg-blue-900 text-blue-300'
                            : item.source === 'bot/mechanic'
                            ? 'bg-purple-900 text-purple-300'
                            : 'bg-gray-900 text-gray-300'
                        }`}>
                          {item.source}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white">
                        <div className="font-semibold">{item.customerName}</div>
                        <div className="text-gray-400 text-xs">{item.customerPhone}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-300 max-w-md">
                        <div className="line-clamp-2 text-sm">
                          ...{item.fullMessage}...
                        </div>
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

export default PriceMonitoring
