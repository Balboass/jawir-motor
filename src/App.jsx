import ChatBox from './components/ChatBox'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header Section */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Logo Placeholder */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
              <svg
                className="w-14 h-14 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-5xl font-bold text-gray-800 tracking-tight">
                JAWIR MOTOR
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Bengkel Motor Terpercaya & Profesional
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Ada Masalah dengan Motor Anda?
          </h2>
          <p className="text-gray-600">
            Chat dengan asisten kami untuk konsultasi awal
          </p>
        </div>

        <ChatBox />
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12 border-t border-gray-200">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600">
          <p>&copy; 2024 JAWIR MOTOR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
