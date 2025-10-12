// WhatsApp Webhook - Smart Bot with Fonnte + OpenAI ChatGPT
// Features: Smart filtering, instant responses, 2-min delay, mechanic detection

const SYSTEM_PROMPT = `You are a friendly and helpful motorcycle mechanic assistant at JAWIR MOTOR, a professional motorcycle workshop.

CONVERSATION FLOW (FOLLOW THIS ORDER):
1. FIRST: Ask about the motorcycle type/brand/model (e.g., Honda Beat, Yamaha NMAX, Suzuki Satria, etc.)
2. SECOND: Ask clarifying questions about the specific problem:
   - Where exactly is the problem? (engine, brakes, electrical, etc.)
   - When does it happen? (starting, riding, braking, etc.)
   - What symptoms? (sounds, smells, vibrations, etc.)
   - How long has this been happening?
3. THIRD: After gathering details, provide 2-3 possible causes
4. FOURTH: Explain why DIY repairs are NOT recommended for this issue
5. FINAL: Strongly recommend bringing the motorcycle to JAWIR MOTOR for professional service

IMPORTANT RULES:
- Always speak in Indonesian (Bahasa Indonesia) naturally
- Be conversational and friendly, not robotic
- NEVER give step-by-step DIY repair instructions
- Always emphasize that motorcycle repairs need professional tools and expertise
- Make customers understand that improper repairs can be dangerous or cause more damage

Always follow this pattern!`

// Workshop location info
const LOCATION_INFO = `📍 *Lokasi JAWIR MOTOR:*

Jl. Raya Jati Makmur No.20, RT.001/RW.005
Jatimakmur, Kec. Pd. Gede
Kota Bekasi, Jawa Barat 17414

🗺️ Google Maps:
https://share.google/p3xyjOQ7wthQjCFsX

⏰ *Jam Buka:*
Senin - Kamis: 10.00 - 17.00
Jumat: Tutup
Sabtu: 10.00 - 17.00
Minggu: 10.00 - 18.00

📞 Kontak: 0896-9688-6340`

// Store conversation state
const conversationHistory = {}
const mechanicHandling = {} // Track which chats mechanic is handling
const pendingReplies = {} // Track delayed responses

// Helper: Check if message is useless
function isUselessMessage(message) {
  const text = message.trim().toLowerCase()

  // Ignore very short messages (1-2 characters)
  if (text.length <= 2) {
    return true
  }

  // Ignore common acknowledgments
  const ignoreKeywords = [
    'ok', 'oke', 'k', 'p', 'y', 'ya', 'iya', 'siap',
    'baik', 'makasih', 'thanks', 'thx', 'mantap', 'sip', 'oke deh'
  ]

  if (ignoreKeywords.includes(text)) {
    return true
  }

  // Ignore emoji-only messages
  const hasOnlyEmojis = /^[\p{Emoji}\s]+$/u.test(text)
  if (hasOnlyEmojis) {
    return true
  }

  return false
}

// Helper: Check if asking for location
function isAskingLocation(message) {
  const text = message.toLowerCase()

  const locationKeywords = [
    'lokasi', 'alamat', 'dimana', 'where', 'location', 'address',
    'sharelok', 'sherlok', 'shareloc', 'share lok', 'share loc',
    'share location', 'gmaps', 'google maps', 'peta', 'map',
    'tempat', 'ada dimana', 'dimna', 'di mana'
  ]

  return locationKeywords.some(keyword => text.includes(keyword))
}

// Helper: Check if debt collection message
function isDebtCollection(message) {
  const text = message.toLowerCase()

  const debtKeywords = [
    'hutang', 'tagihan', 'debt', 'pembayaran', 'cicilan',
    'pinjaman', 'bayar', 'lunas', 'tunggakan', 'collection'
  ]

  return debtKeywords.some(keyword => text.includes(keyword))
}

// Helper: Check if conversation ender
function isConversationEnder(message) {
  const text = message.toLowerCase()

  const enderKeywords = [
    'terima kasih', 'thanks', 'thx', 'makasih', 'thank you',
    'sampai jumpa', 'bye', 'ditunggu', 'silakan datang',
    'oke terima kasih', 'ok terima kasih', 'sip terima kasih'
  ]

  return enderKeywords.some(keyword => text.includes(keyword))
}

// Helper: Send message via Fonnte
async function sendFonteMessage(phone, message, token) {
  const response = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      target: phone,
      message: message,
      countryCode: '62'
    })
  })

  const data = await response.json().catch(() => ({}))
  console.log('Fonnte response:', data)

  return response.ok
}

// Helper: Sleep/delay function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

exports.handler = async function(event, context) {
  // Handle POST requests only
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const body = JSON.parse(event.body)
    console.log('Webhook received:', JSON.stringify(body, null, 2))

    // Extract data
    const customerPhone = body.from || body.sender || body.number || body.phone
    const customerMessage = body.message || body.text
    const isFromMe = body.fromMe === true || body.from_me === true

    console.log('Extracted:', { customerPhone, customerMessage, isFromMe })

    // Handle mechanic messages
    if (isFromMe) {
      console.log('Message from mechanic detected')

      // Check for bot commands
      const command = customerMessage?.trim().toLowerCase()

      if (command === '/bot on') {
        mechanicHandling[customerPhone] = false
        console.log('Bot enabled for:', customerPhone)
        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'bot enabled' })
        }
      }

      if (command === '/bot off') {
        mechanicHandling[customerPhone] = true
        console.log('Bot disabled for:', customerPhone)
        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'bot disabled' })
        }
      }

      // Mark as mechanic handling
      mechanicHandling[customerPhone] = true

      // Cancel any pending bot reply
      if (pendingReplies[customerPhone]) {
        clearTimeout(pendingReplies[customerPhone])
        delete pendingReplies[customerPhone]
        console.log('Cancelled pending bot reply')
      }

      // Check if conversation ender
      if (isConversationEnder(customerMessage)) {
        mechanicHandling[customerPhone] = false
        console.log('Conversation ended, bot can resume')
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'mechanic handling' })
      }
    }

    // Ignore empty messages
    if (!customerMessage || !customerMessage.trim()) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ignored', reason: 'empty' })
      }
    }

    // Check if mechanic is handling this customer
    if (mechanicHandling[customerPhone]) {
      console.log('Mechanic is handling this chat, bot stays quiet')
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'mechanic active' })
      }
    }

    // Filter useless messages
    if (isUselessMessage(customerMessage)) {
      console.log('Useless message ignored:', customerMessage)
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ignored', reason: 'useless message' })
      }
    }

    // Get Fonnte token
    const fonntToken = process.env.FONNTE_API_TOKEN
    if (!fonntToken) {
      console.error('Fonnte token not configured')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Token not configured' })
      }
    }

    // INSTANT RESPONSE: Location request
    if (isAskingLocation(customerMessage)) {
      console.log('Location request detected, instant reply')
      await sendFonteMessage(customerPhone, LOCATION_INFO, fonntToken)
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'location sent' })
      }
    }

    // INSTANT RESPONSE: Debt collection
    if (isDebtCollection(customerMessage)) {
      console.log('Debt collection detected, auto-reject')
      const rejectMessage = '❌ Nomor ini dikelola oleh bot otomatis. Mohon jangan mengirim pesan penagihan di sini. Terima kasih.'
      await sendFonteMessage(customerPhone, rejectMessage, fonntToken)
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'debt rejected' })
      }
    }

    // For normal messages: Wait 2 minutes before AI responds
    console.log('Normal message, waiting 2 minutes before AI response...')

    // Store pending reply
    const replyId = `${customerPhone}_${Date.now()}`

    // Schedule AI response after 2 minutes
    pendingReplies[customerPhone] = setTimeout(async () => {
      try {
        // Check again if mechanic took over during wait
        if (mechanicHandling[customerPhone]) {
          console.log('Mechanic took over during wait, cancelling AI response')
          delete pendingReplies[customerPhone]
          return
        }

        console.log('2 minutes passed, generating AI response')

        // Initialize conversation history
        if (!conversationHistory[customerPhone]) {
          conversationHistory[customerPhone] = []
        }

        // Add customer message to history
        conversationHistory[customerPhone].push({
          role: 'user',
          content: customerMessage
        })

        // Keep only last 10 messages
        if (conversationHistory[customerPhone].length > 10) {
          conversationHistory[customerPhone] = conversationHistory[customerPhone].slice(-10)
        }

        // Get OpenAI API key
        const openaiApiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
        if (!openaiApiKey) {
          console.error('OpenAI API key not found')
          return
        }

        // Call OpenAI
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...conversationHistory[customerPhone]
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        })

        if (!openaiResponse.ok) {
          console.error('OpenAI error:', await openaiResponse.text())
          return
        }

        const openaiData = await openaiResponse.json()
        const aiReply = openaiData.choices[0].message.content

        // Add to history
        conversationHistory[customerPhone].push({
          role: 'assistant',
          content: aiReply
        })

        // Send reply
        console.log('Sending AI reply to:', customerPhone)
        await sendFonteMessage(customerPhone, aiReply, fonntToken)

        delete pendingReplies[customerPhone]

      } catch (error) {
        console.error('Error in delayed response:', error)
        delete pendingReplies[customerPhone]
      }
    }, 2 * 60 * 1000) // 2 minutes

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'scheduled',
        message: 'Will respond in 2 minutes if mechanic does not reply'
      })
    }

  } catch (error) {
    console.error('Webhook error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal error',
        details: error.message
      })
    }
  }
}
