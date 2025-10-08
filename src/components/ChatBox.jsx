import { useState } from 'react'
import sendMessageToAI from '../services/openai'

function ChatBox() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!input.trim()) return

    // Add user message to chat
    const userMessage = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      // Call the API service (currently using placeholder, see src/services/openai.js)
      const aiResponse = await sendMessageToAI(updatedMessages)

      const aiMessage = {
        role: 'assistant',
        content: aiResponse
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi bengkel kami secara langsung.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
        <h2 className="text-xl font-semibold">Chat dengan Asisten Mekanik</h2>
        <p className="text-sm text-blue-100 mt-1">Ceritakan masalah motor Anda</p>
      </div>

      {/* Messages Container */}
      <div className="h-96 overflow-y-auto p-6 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Mulai percakapan dengan mengetik masalah motor Anda</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 shadow rounded-bl-none border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 px-4 py-3 rounded-lg shadow border border-gray-200">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik masalah motor Anda..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Kirim
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatBox
