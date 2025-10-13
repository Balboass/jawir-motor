// WhatsApp Webhook - Smart Bot with Fonnte + OpenAI ChatGPT + Supabase
// Features: Smart filtering, instant responses, mechanic detection, database storage

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const SYSTEM_PROMPT = `You are a friendly and helpful motorcycle mechanic assistant at JAWIR MOTOR, a professional motorcycle workshop.

WORKSHOP INFO:
- Mechanics: Bang Jawir (also called "Wir") and Bang Muhtarom (also called "Rom")
- When customers say "bang jawir", "wir", "bang muhtarom", "rom", "bang", etc., they're greeting YOU

RESPONSE TYPES (DETECT INTENT AND RESPOND APPROPRIATELY):

1. SERVICE REQUEST (customer wants service/repair):
   Examples: "Sekalian minta tolong pasangin lampu tembak bang", "Sama ganti kampas rem belakang"
   Response: "Yaudah bawa aja ke bengkel bang" or "Siap, bawa aja ke bengkel bang"
   Keep it SHORT and direct!

2. SCHEDULING/TIMING (customer mentions day/time):
   Examples: "Palingan sabtu diambil", "Besok sore bisa?", "Senin bisa dibawa"
   Response: "Siap bang" or "Oke bang ditunggu"

3. PERSONAL ISSUE/CAN'T COME (mentions problem/busy):
   Examples: "Soalnya jumat gua ada acara kantor bang", "Lagi ga bisa ke bengkel"
   Response: "Telepon aja langsung bang jangan di chat" or "Hubungi langsung via telepon ya bang"

4. DEBT/MONEY REQUEST (BU = Butuh Uang):
   Examples: "BU lagi bu buat ganti ban", "Bang BU dong"
   Response: "Untuk urusan pembayaran, langsung telepon bang jawir ya"
   DON'T discuss money via chat!

5. PARTS/DETAILS QUESTION (customer asks what to prepare):
   Examples: "Mas apa saja yg aq siapin part nya", "Perlu bawa apa?"
   Response: "Tunggu ya nanti dibales lagi bang" or "Nanti dikabari lagi ya"
   Let mechanic handle details!

6. ACKNOWLEDGMENT (ok, oke, siap, etc.):
   Examples: "OK", "oke wir", "oke mas", "okay", "siap bang"
   Response: IGNORE - don't reply to these

7. TECHNICAL PROBLEM (motorcycle issue):
   Examples: "Motor susah hidup", "Rem berisik", "Oli bocor"
   Response: Ask details, then recommend: "Sebaiknya dibawa ke bengkel bang, biar dicek langsung"

RESPONSE STYLE:
- Keep responses SHORT (1-2 sentences max)
- Use casual Indonesian: "bang", "aja", "ya", "ntar"
- Be friendly but brief
- Don't over-explain
- Use mechanic slang naturally

NEVER:
- Give DIY repair instructions
- Discuss prices via chat (tell them to call)
- Send long explanations
- Respond to "ok", "oke", "siap" acknowledgments

Always detect customer intent first, then respond with the appropriate short answer!`

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

// Store conversation state (in-memory cache for performance)
const conversationHistory = {}

// 30 minutes in milliseconds
const MECHANIC_COOLDOWN = 30 * 60 * 1000 // 30 minutes

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

// Helper: Check if message is just a greeting (halo, hai, etc.)
function isJustGreeting(message) {
  const text = message.trim().toLowerCase()

  // List of greetings
  const greetings = [
    'halo', 'hai', 'hello', 'hi', 'hey', 'hallo',
    'assalamualaikum', 'salam', 'pagi', 'siang', 'sore', 'malam',
    'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
    'bang', 'mas', 'pak', 'bro', 'gan', 'om', 'kak',
    'bang jawir', 'bang wir', 'wir', 'bang muhtarom', 'bang rom', 'rom'
  ]

  // Check if message is ONLY a greeting (no other content)
  return greetings.some(greeting => text === greeting || text === `${greeting}!`)
}

// Helper: Check if message is just casual greeting (no motorcycle problem mentioned)
// NOTE: This function is intentionally disabled - bot should respond to ALL greetings
function isCasualGreeting(message) {
  // Always return false - bot responds to all greetings (halo, hai, wir, bang, etc.)
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
    'sharelok', 'sherlok', 'shareloc', 'sharlok', 'serlok', 'serloc',
    'share lok', 'share loc', 'share location', 'sherlock',
    'gmaps', 'google maps', 'peta', 'map',
    'tempat', 'ada dimana', 'dimna', 'di mana', 'adain', 'ada di'
  ]

  return locationKeywords.some(keyword => text.includes(keyword))
}

// Helper: Check if asking for operating hours
function isAskingHours(message) {
  const text = message.toLowerCase()

  const hoursKeywords = [
    'jam buka', 'jam tutup', 'jam operasional', 'jam kerja',
    'buka jam', 'tutup jam', 'open hour', 'close hour', 'opening hour',
    'buka kapan', 'tutup kapan', 'jam berapa', 'kapan buka', 'kapan tutup',
    'hari apa buka', 'hari apa tutup', 'buka tidak', 'buka nggak',
    'buka gak', 'tutup tidak', 'tutup nggak', 'tutup gak',
    'jadwal buka', 'jadwal tutup', 'schedule', 'hours'
  ]

  return hoursKeywords.some(keyword => text.includes(keyword))
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
async function sendFonteMessage(phone, message, token, keepUnread = false) {
  const payload = {
    target: phone,
    message: message,
    countryCode: '62'
  }

  // Note: keepUnread parameter available but delay may not be supported by Fonnte
  // Keeping parameter for future use if Fonnte adds this feature

  const response = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
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
    const isFromMe = body.fromMe === true || body.from_me === true || body.fromme === true

    console.log('Extracted:', {
      customerPhone,
      customerMessage,
      isFromMe,
      device: body.device,
      pengirim: body.pengirim
    })

    // NOTE: Use the Bot Control web page (/admin/bot-control) to manually pause bot
    // Fonnte doesn't send webhooks when you reply, so automatic detection is not possible

    // Handle mechanic messages (if Fonnte ever sends them)
    if (isFromMe) {
      console.log('Message from mechanic detected')

      // Check for bot commands
      const command = customerMessage?.trim().toLowerCase()

      if (command === '/bot on') {
        await supabase.from('bot_settings').upsert({
          customer_phone: customerPhone,
          bot_disabled: false,
          last_manual_reply: null,
          cooldown_until: null
        })
        console.log('Bot enabled immediately for:', customerPhone)
        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'bot enabled' })
        }
      }

      if (command === '/bot off') {
        await supabase.from('bot_settings').upsert({
          customer_phone: customerPhone,
          bot_disabled: true
        })
        console.log('Bot disabled permanently for:', customerPhone)
        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'bot disabled' })
        }
      }

      if (command === 'jawir88') {
        // Block number in database
        await supabase.from('blocked_numbers').upsert({
          phone_number: customerPhone,
          blocked_by: 'mechanic'
        })
        console.log('Number permanently blocked with jawir88 command:', customerPhone)
        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'number permanently blocked' })
        }
      }

      // Clear conversation history when mechanic takes over
      if (conversationHistory[customerPhone]) {
        delete conversationHistory[customerPhone]
        console.log('Cleared conversation history - mechanic took over')
      }

      // Record when mechanic replied in database
      const now = new Date()
      let cooldownUntil

      // Check if conversation ender - reduces cooldown to 5 minutes
      if (isConversationEnder(customerMessage)) {
        cooldownUntil = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        console.log('Conversation ended, bot can resume in 5 minutes')
      } else {
        cooldownUntil = new Date(Date.now() + MECHANIC_COOLDOWN) // 30 minutes
        console.log('Mechanic replied, bot paused for 30 minutes')
      }

      const { data: upsertResult, error: upsertError } = await supabase
        .from('bot_settings')
        .upsert({
          customer_phone: customerPhone,
          last_manual_reply: now.toISOString(),
          cooldown_until: cooldownUntil.toISOString(),
          has_greeted: false // Reset greeting flag when mechanic takes over
        }, {
          onConflict: 'customer_phone'
        })

      if (upsertError) {
        console.error('Error updating cooldown:', upsertError)
      } else {
        console.log('Cooldown successfully set until:', cooldownUntil.toISOString())
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

    // Check if customer sent jawir88 (wants to disable bot for themselves)
    if (customerMessage.trim().toLowerCase() === 'jawir88') {
      await supabase.from('blocked_numbers').upsert({
        phone_number: customerPhone,
        blocked_by: 'customer'
      })
      console.log('Customer sent jawir88, bot disabled forever for:', customerPhone)
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'customer disabled bot with jawir88' })
      }
    }

    // Check if number is permanently blocked (jawir88 command) from database
    const { data: blockedCheck } = await supabase
      .from('blocked_numbers')
      .select('phone_number')
      .eq('phone_number', customerPhone)
      .single()

    if (blockedCheck) {
      console.log('Number is permanently blocked, ignoring all messages')
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'blocked', reason: 'jawir88 command' })
      }
    }

    // Check bot settings from database
    const { data: botSettings } = await supabase
      .from('bot_settings')
      .select('*')
      .eq('customer_phone', customerPhone)
      .single()

    // Check if bot is permanently disabled for this customer
    if (botSettings && botSettings.bot_disabled) {
      console.log('Bot permanently disabled for this chat')
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'bot disabled' })
      }
    }

    // Check if within cooldown period after mechanic reply
    if (botSettings && botSettings.cooldown_until) {
      const cooldownUntil = new Date(botSettings.cooldown_until)
      const now = new Date()

      console.log('Cooldown check:', {
        cooldownUntil: cooldownUntil.toISOString(),
        now: now.toISOString(),
        isActive: cooldownUntil > now
      })

      if (cooldownUntil > now) {
        const minutesRemaining = Math.ceil((cooldownUntil - now) / 60000)
        console.log(`Bot paused, ${minutesRemaining} minutes remaining until bot can respond`)
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'cooldown',
            minutesRemaining
          })
        }
      } else {
        // Cooldown expired, clear it from database
        await supabase.from('bot_settings').update({
          cooldown_until: null
        }).eq('customer_phone', customerPhone)
        console.log('Cooldown expired, bot can respond again')
      }
    } else {
      console.log('No cooldown settings found for this customer')
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
      await sendFonteMessage(customerPhone, waitMessage, fonntToken, true) // Keep unread
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'location request - waiting for manual' })
      }
    }

    // INSTANT RESPONSE: Operating hours request
    if (isAskingHours(customerMessage)) {
      console.log('Operating hours request detected')
      const hoursMessage = `⏰ *JAM BUKA JAWIR MOTOR:*

📅 Minggu: 10.00 - 18.00
📅 Senin: 10.00 - 17.00
📅 Selasa: 10.00 - 17.00
📅 Rabu: 10.00 - 17.00
📅 Kamis: 10.00 - 17.00
📅 Jumat: Tutup
📅 Sabtu: 10.00 - 17.00

_*Catatan:* Kadang hari Jumat buka juga, mohon tunggu balasan manual untuk konfirmasi._`
      await sendFonteMessage(customerPhone, hoursMessage, fonntToken, true) // Keep unread
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'hours info sent' })
      }
    }

    // INSTANT RESPONSE: Debt collection
    if (isDebtCollection(customerMessage)) {
      console.log('Debt collection detected, auto-reject')
      const rejectMessage = '❌ Nomor ini dikelola oleh bot otomatis. Mohon jangan mengirim pesan penagihan di sini. Terima kasih.'
      await sendFonteMessage(customerPhone, rejectMessage, fonntToken, false) // Mark as read (no need to check)
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
        console.log('Generating AI response')

        // Check if AI has already greeted this customer
        const { data: greetingCheck } = await supabase
          .from('bot_settings')
          .select('has_greeted')
          .eq('customer_phone', customerPhone)
          .single()

        const hasAlreadyGreeted = greetingCheck?.has_greeted === true

        // If bot already greeted and customer just says "halo" again, ignore
        // Bot should only respond once until customer explains their problem
        if (hasAlreadyGreeted && isJustGreeting(customerMessage)) {
          console.log('Customer sent another greeting after bot already greeted, ignoring')
          return
        }

        // If customer sends nonsense after being greeted, ignore it
        if (hasAlreadyGreeted && isUselessMessage(customerMessage)) {
          console.log('Customer sent nonsense after greeting, ignoring to prevent loop')
          return
        }

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

        // Call OpenAI (using GPT-4 for better understanding)
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Better at understanding context and intent
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...conversationHistory[customerPhone]
            ],
            temperature: 0.5, // Lower temp for more consistent, shorter responses
            max_tokens: 150 // Shorter responses (was 500)
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

        // Send reply (keep chat unread so mechanic can review)
        console.log('Sending AI reply to:', customerPhone)
        await sendFonteMessage(customerPhone, aiReply, fonntToken, true) // Keep unread

        // Mark as greeted after first AI response
        await supabase.from('bot_settings').upsert({
          customer_phone: customerPhone,
          has_greeted: true
        })

        // Save conversation to database
        await supabase.from('conversations').insert({
          customer_phone: customerPhone,
          customer_name: body.name || null,
          message: customerMessage,
          bot_reply: aiReply,
          message_type: 'problem',
          is_from_me: false
        })
        console.log('Conversation saved to database')

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
