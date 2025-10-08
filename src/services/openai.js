/**
 * OpenAI API Service
 *
 * This file contains the placeholder for OpenAI API integration.
 * Replace the placeholder function with actual API calls when ready.
 */

// ====================================
// CONFIGURATION
// ====================================
// API key is loaded from environment variables (.env file)
// IMPORTANT: Never commit the .env file to git!
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// System prompt that defines the AI's behavior
const SYSTEM_PROMPT = `You are a friendly and helpful motorcycle mechanic assistant at JAWIR MOTOR, a professional motorcycle workshop.

Your role:
1. Listen to customer's motorcycle problems
2. Provide possible causes for the issue
3. Give helpful preliminary advice
4. ALWAYS recommend bringing the motorcycle to JAWIR MOTOR workshop for proper inspection and repair
5. Be friendly, professional, and speak in Indonesian (Bahasa Indonesia)

Response format:
- Start with a friendly greeting
- List 2-3 possible causes
- Emphasize the importance of professional inspection
- End by inviting them to visit the workshop`

// ====================================
// API FUNCTIONS
// ====================================

/**
 * Send a message to OpenAI and get a response
 * @param {Array} messages - Array of message objects with 'role' and 'content'
 * @returns {Promise<string>} - AI response text
 */
export async function sendMessageToAI(messages) {
  try {
    // Use Netlify Function in production, localhost in development
    const apiUrl = import.meta.env.DEV
      ? 'http://localhost:3001/api/chat'
      : '/.netlify/functions/chat'

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.message
  } catch (error) {
    console.error('Error calling AI:', error)
    throw new Error('Gagal menghubungi asisten AI. Silakan coba lagi.')
  }
}

/**
 * Alternative: Call via your own backend API
 * This is more secure as it keeps your API key on the server
 *
 * Example:
 */
export async function sendMessageToBackend(messages) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages })
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const data = await response.json()
    return data.message
  } catch (error) {
    console.error('Error calling backend API:', error)
    throw new Error('Gagal menghubungi server. Silakan coba lagi.')
  }
}

// Export the function you want to use
export default sendMessageToAI
