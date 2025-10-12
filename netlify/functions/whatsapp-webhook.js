// WhatsApp Webhook - Smart Bot with Fonnte + OpenAI ChatGPT
// Features: Smart filtering, instant responses, 2-min delay, mechanic detection

const SYSTEM_PROMPT = `You are a friendly and helpful motorcycle mechanic assistant at JAWIR MOTOR, a professional motorcycle workshop.

IMPORTANT: ONLY respond to messages about MOTORCYCLE PROBLEMS. If the customer is just saying casual greetings like "bang jawir", "wir", "bro", "halo", etc. WITHOUT mentioning any motorcycle problem, DO NOT engage - let the human mechanic handle casual chats.

CONVERSATION FLOW (FOLLOW THIS ORDER):
1. FIRST: Confirm they have a motorcycle problem, then ask about the motorcycle brand/model
   - Valid brands: Honda, Yamaha, Suzuki, Kawasaki, TVS, Vespa, Piaggio
   - Common models: Beat, Scoopy, Vario, PCX, NMAX, Aerox, Mio, Satria FU, Ninja, etc.
   - If someone says "wir", "jawir", "bang" alone - IGNORE IT, it's just a greeting for the workshop owner
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
- If someone mentions "Satria Lumba" or weird bike names, clarify: "Maksudnya Suzuki Satria FU ya? Atau motor apa?"

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
const mechanicLastReply = {} // Track when mechanic last replied

// 1 hour in milliseconds
const MECHANIC_COOLDOWN = 60 * 60 * 1000 // 1 hour

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

// Helper: Check if message is just casual greeting (no motorcycle problem mentioned)
function isCasualGreeting(message) {
  const text = message.trim().toLowerCase()

  // List of casual greetings that should be ignored (let mechanic handle)
  const casualGreetings = [
    'bang', 'bro', 'mas', 'pak', 'om', 'gan', 'wir', 'jawir',
    'bang jawir', 'hai', 'halo', 'hello', 'hi', 'hei', 'hey',
    'assalamualaikum', 'salam', 'selamat pagi', 'selamat siang',
    'selamat sore', 'selamat malam', 'pagi', 'siang', 'sore', 'malam'
  ]

  // If message is ONLY a greeting (no additional context), ignore it
  if (casualGreetings.includes(text)) {
    return true
  }

  // If message is very short and matches greeting pattern
  if (text.length <= 15 && casualGreetings.some(greeting => text === greeting || text.startsWith(greeting + ' '))) {
    // Check if there's actual problem keywords after the greeting
    const problemKeywords = [
      'motor', 'mobil', 'rusak', 'masalah', 'problem', 'susah', 'ga bisa',
      'gak bisa', 'tidak bisa', 'mogok', 'mati', 'berisik', 'bunyi',
      'bocor', 'rem', 'ban', 'oli', 'servis', 'service', 'perbaikan',
      'honda', 'yamaha', 'suzuki', 'kawasaki', 'beat', 'vario', 'nmax',
      'scoopy', 'mio', 'aerox', 'satria', 'ninja', 'pcx'
    ]

    const hasProblemContext = problemKeywords.some(keyword => text.includes(keyword))

    // If no problem context, it's just a casual greeting
    if (!hasProblemContext) {
      return true
    }
  }

  return false
}

// Helper: Check if message contains bad words/harassment
function isBadWordMessage(message) {
  const text = message.toLowerCase()

  // List of bad words to ignore
  const badWords = [
    'goblok', 'goblog', 'tolol', 'bodoh', 'idiot', 'anjing', 'asu',
    'kontol', 'memek', 'ngentot', 'jancok', 'bangsat', 'bajingan',
    'kampret', 'bego', 'dungu', 'sialan', 'tai', 'fuck', 'shit',
    'bitch', 'asshole', 'damn', 'cunt', 'dick', 'pussy', 'ngehe',
    'kampang', 'perek', 'pelacur', 'lonte', 'jablay', 'monyet',
    'babi', 'anjir', 'anjrit', 'setan', 'keparat', 'kunyuk'
  ]

  // Check if any bad word is in the message
  const hasBadWord = badWords.some(badWord => text.includes(badWord))

  return hasBadWord
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
        delete mechanicLastReply[customerPhone]
        console.log('Bot enabled immediately for:', customerPhone)
        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'bot enabled' })
        }
      }

      if (command === '/bot off') {
        mechanicHandling[customerPhone] = true
        console.log('Bot disabled permanently for:', customerPhone)
        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'bot disabled' })
        }
      }

      // Record when mechanic replied
      mechanicLastReply[customerPhone] = Date.now()
      console.log('Mechanic replied, bot paused for 1 hour')

      // Check if conversation ender - reduces cooldown to 5 minutes
      if (isConversationEnder(customerMessage)) {
        // Conversation ended, bot can resume after 5 minutes instead of 1 hour
        mechanicLastReply[customerPhone] = Date.now() - (MECHANIC_COOLDOWN - 5 * 60 * 1000)
        console.log('Conversation ended, bot can resume in 5 minutes')
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

    // Check if mechanic is handling this customer (permanently disabled)
    if (mechanicHandling[customerPhone]) {
      console.log('Bot permanently disabled for this chat')
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'bot disabled' })
      }
    }

    // Check if within 1-hour cooldown after mechanic reply
    if (mechanicLastReply[customerPhone]) {
      const timeSinceReply = Date.now() - mechanicLastReply[customerPhone]
      const cooldownRemaining = MECHANIC_COOLDOWN - timeSinceReply

      if (cooldownRemaining > 0) {
        const minutesRemaining = Math.ceil(cooldownRemaining / 60000)
        console.log(`Bot paused, ${minutesRemaining} minutes remaining until bot can respond`)
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'cooldown',
            minutesRemaining
          })
        }
      } else {
        // Cooldown expired, bot can respond again
        delete mechanicLastReply[customerPhone]
        console.log('Cooldown expired, bot can respond again')
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

    // Filter casual greetings (let mechanic handle)
    if (isCasualGreeting(customerMessage)) {
      console.log('Casual greeting ignored (no problem mentioned):', customerMessage)
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ignored', reason: 'casual greeting - let mechanic handle' })
      }
    }

    // Filter bad words / harassment
    if (isBadWordMessage(customerMessage)) {
      console.log('Bad word detected, ignoring:', customerMessage)
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ignored', reason: 'harassment/bad words' })
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

    // INSTANT RESPONSE: Location request - ask them to wait
    if (isAskingLocation(customerMessage)) {
      console.log('Location request detected, asking to wait')
      const waitMessage = 'Tunggu ya, nanti akan di-share lokasi nya 📍'
      await sendFonteMessage(customerPhone, waitMessage, fonntToken)
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'location request - waiting for manual' })
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

    // For normal messages: Respond immediately with AI
    console.log('Normal message, generating AI response immediately...')

    // Function to generate and send AI response
    const sendAIResponse = async () => {
      try {
        // Check if mechanic took over
        if (mechanicHandling[customerPhone]) {
          console.log('Mechanic took over, cancelling AI response')
          return
        }

        console.log('Generating AI response')

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

      } catch (error) {
        console.error('Error in AI response:', error)
      }
    }

    // Send AI response immediately (not delayed)
    await sendAIResponse()

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'AI response sent'
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
