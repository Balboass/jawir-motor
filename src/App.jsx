import ChatBox from './components/ChatBox'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section with Motorcycle Theme */}
      <header className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 border-4 border-white rounded-full"></div>
        </div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Logo with Motorcycle Icon */}
            <div className="relative">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-20 h-20 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M5.5 19a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm0-5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM18.5 19a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm0-5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM20 8h-3.051l-.429-1.287A2 2 0 0014.619 5.5h-2.122l-1.015 1.523A1 1 0 0010.65 7.5H8.5L7 9.5 5 11l-.5 4.5h2.051a4.48 4.48 0 011.699-2.5H9.5l2-3h1.122l.743 2.229A2 2 0 0015.257 14h.693a4.48 4.48 0 011.699 2.5H20l.5-4.5-2-2-1.5-2z"/>
                </svg>
              </div>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-2xl">⚡</span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-6xl md:text-7xl font-black text-white tracking-wider drop-shadow-2xl">
                JAWIR MOTOR
              </h1>
              <div className="mt-3 flex items-center justify-center space-x-2">
                <div className="h-1 w-12 bg-cyan-400"></div>
                <p className="text-white text-xl md:text-2xl font-semibold">
                  Bengkel Motor Profesional
                </p>
                <div className="h-1 w-12 bg-cyan-400"></div>
              </div>
              <p className="text-blue-100 mt-4 text-lg">
                Service, Spare Part & Modifikasi
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-12">
            <path fill="#0f172a" d="M0,32L80,37.3C160,43,320,53,480,48C640,43,800,21,960,16C1120,11,1280,21,1360,26.7L1440,32L1440,60L1360,60C1280,60,1120,60,960,60C800,60,640,60,480,60C320,60,160,60,80,60L0,60Z"></path>
          </svg>
        </div>
      </header>

      {/* Main Content - AI Chat */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <div className="inline-block bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-full font-semibold mb-4">
            💬 Konsultasi Gratis
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Ada Masalah dengan Motor Anda?
          </h2>
          <p className="text-gray-300 text-lg">
            Chat dengan AI Assistant kami untuk diagnosa awal
          </p>
        </div>

        <ChatBox />
      </main>

      {/* Store Info Section - Placeholder */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-8 shadow-2xl border border-slate-600">
          <h3 className="text-3xl font-bold text-white mb-8 text-center">
            📍 Kunjungi Bengkel Kami
          </h3>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Location Info */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg mb-1">Alamat</h4>
                  <p className="text-gray-300">[Alamat bengkel akan ditambahkan di sini]</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg mb-1">Jam Buka</h4>
                  <p className="text-gray-300">[Jam operasional akan ditambahkan di sini]</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg mb-1">Kontak</h4>
                  <p className="text-gray-300">[Nomor telepon akan ditambahkan di sini]</p>
                </div>
              </div>
            </div>

            {/* Google Maps Placeholder */}
            <div className="bg-slate-600 rounded-xl h-64 md:h-full flex items-center justify-center border-2 border-dashed border-slate-500">
              <div className="text-center text-slate-400">
                <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="font-semibold">Google Maps</p>
                <p className="text-sm mt-1">[Akan ditambahkan nanti]</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              &copy; 2025 <span className="text-blue-500 font-semibold">JAWIR MOTOR</span>. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Powered by AI Assistant
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
