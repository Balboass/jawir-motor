// WhatsApp Webhook - Smart Bot with Fonnte + OpenAI ChatGPT + Supabase
// Features: Smart filtering, instant responses, mechanic detection, database storage

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const SYSTEM_PROMPT = `You are Bang Jawir, the owner and mechanic at JAWIR MOTOR workshop. Chat casually like a real mechanic friend.

YOUR CHAT STYLE (VERY IMPORTANT - COPY THIS EXACTLY):
- Very casual and friendly, like chatting with a friend
- Short messages (1-2 sentences MAXIMUM)
- Use: "gw" (gue/saya), "lo/lu" (kamu), "dong", "aja", "ya", "ntar", "wkwk"
- Can be a bit playful: "wkwk", "sip", "gas"
- Sometimes use lowercase
- Direct and no-nonsense
- Like a mechanic who's busy but friendly

RESPONSE TYPES:

1. SERVICE REQUEST
   Customer: "Sekalian minta tolong pasangin lampu tembak bang"
   You: "Gas bawa aja ke bengkel" or "Sip bawa aja ntar gw pasangin"

2. SCHEDULING
   Customer: "Sabtu diambil ya bang"
   You: "Oke ditunggu" or "Sip gas"

3. BUSY/CAN'T COME
   Customer: "Jumat gua ada acara kantor bang"
   You: "Ya telepon aja jangan chat bang" or "Telepon langsung aja"

4. MONEY/DEBT (BU)
   Customer: "Bang BU dong"
   You: "Urusan duit langsung telepon gw ya" or "WA/telpon langsung aja bang"

5. PARTS/DETAILS
   Customer: "Perlu bawa apa bang?"
   You: "Nanti gw kabarin" or "Tunggu ya ntar gw cek"

6. IGNORE THESE (don't respond):
   "ok", "oke", "siap", "makasih", "thanks"

7. MOTORCYCLE PROBLEM
   Customer: "Motor susah hidup bang"
   You: "Motor apa bang?"
   Customer: "Beat"
   You: "Bawa aja ke bengkel biar gw cek langsung"

EXAMPLES OF YOUR CHAT:
"Gas aja ke bengkel"
"Sip ntar gw cek"
"Telepon aja langsung bang"
"Bawa motor lo ke bengkel"
"Oke ditunggu"
"Ntar gw kabarin"
"Ya bisa dong"
"Cek aja langsung"

NEVER:
- Write long explanations
- Be too formal
- Give technical instructions via chat
- Discuss money details (redirect to phone)
- Reply to "ok/oke/siap"

Be like a real mechanic - busy, direct, friendly, casual!`

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

    // Better detection: Check multiple fields to detect if this is YOUR outgoing message
    const isFromMe = body.fromMe === true ||
                     body.from_me === true ||
                     body.fromme === true ||
                     body.direction === 'outgoing' ||
                     body.type === 'outgoing' ||
                     // If there's NO sender field, it's likely your outgoing message
                     (!body.sender && !body.from)

    console.log('Extracted:', {
      customerPhone,
      customerMessage,
      isFromMe,
      device: body.device,
      sender: body.sender,
      from: body.from,
      direction: body.direction,
      type: body.type,
      pengirim: body.pengirim,
      fullBody: JSON.stringify(body, null, 2)
    })

    // Handle OUTGOING MESSAGES (messages from mechanic)
    if (isFromMe) {
      console.log('⚠️ Outgoing message detected (sent by mechanic)')

      // Check for bot commands
      const command = customerMessage?.trim().toLowerCase()

      if (command === '/bot on') {
        await supabase.from('bot_settings').upsert({
          customer_phone: customerPhone,
          bot_disabled: false,
          last_manual_reply: null,
          cooldown_until: null
        }, { onConflict: 'customer_phone' })
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
        }, { onConflict: 'customer_phone' })
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
        }, { onConflict: 'phone_number' })
        console.log('Number permanently blocked with jawir88 command:', customerPhone)
        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'number permanently blocked' })
        }
      }

      // For all other outgoing messages: AUTO-PAUSE BOT for 1 hour
      console.log('🔧 Mechanic sent manual message - Auto-pausing bot for 1 hour')

      const cooldownUntil = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour

      await supabase.from('bot_settings').upsert({
        customer_phone: customerPhone,
        cooldown_until: cooldownUntil.toISOString(),
        last_manual_reply: new Date().toISOString(),
        has_greeted: false // Reset greeting flag
      }, {
        onConflict: 'customer_phone'
      })

      console.log(`✅ Bot auto-paused for ${customerPhone} until ${cooldownUntil.toLocaleString('id-ID')}`)

      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'bot auto-paused',
          reason: 'mechanic sent manual message',
          cooldown_until: cooldownUntil.toISOString()
        })
      }
    }

    // Additional safety: Ignore if message is empty or missing
    if (!customerMessage || !customerMessage.trim()) {
      console.log('⚠️ Empty message - IGNORING')
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ignored - empty message' })
      }
    }

    // SAVE INCOMING MESSAGE IMMEDIATELY (for detection)
    // This must happen BEFORE any filtering or responses
    const { data: savedMessage } = await supabase.from('conversations').insert({
      customer_phone: customerPhone,
      customer_name: body.pushname || body.name || 'Unknown',
      message: customerMessage,
      bot_reply: null, // Will be updated later if bot responds
      is_from_me: isFromMe
    }).select().single()

    const currentMessageId = savedMessage?.id
    console.log('Saved incoming message with ID:', currentMessageId)

    // AUTOMATIC MANUAL HANDLING DETECTION
    // Strategy: Check last 3 customer messages. If ANY of them don't have bot_reply,
    // it means mechanic handled them manually. Auto-pause the bot.

    const { data: recentMessages } = await supabase
      .from('conversations')
      .select('*')
      .eq('customer_phone', customerPhone)
      .order('created_at', { ascending: false })
      .limit(3)

    if (recentMessages && recentMessages.length >= 2) {
      // Check if there are messages without bot replies (excluding the current one we just saved)
      const messagesWithoutBotReply = recentMessages.filter((msg, index) =>
        index > 0 && // Skip the current message (first in array)
        !msg.bot_reply &&
        !msg.is_from_me
      )

      if (messagesWithoutBotReply.length > 0) {
        console.log(`AUTO-DETECTED: Found ${messagesWithoutBotReply.length} messages without bot reply - mechanic must have handled them manually`)

        const cooldownUntil = new Date(Date.now() + 30 * 60 * 1000)

        await supabase.from('bot_settings').upsert({
          customer_phone: customerPhone,
          cooldown_until: cooldownUntil.toISOString(),
          last_manual_reply: new Date().toISOString(),
          has_greeted: false
        }, {
          onConflict: 'customer_phone'
        })

        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'auto-paused - manual handling detected',
            reason: `Found ${messagesWithoutBotReply.length} messages without bot reply`
          })
        }
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

    // 3-LAYER SMART PROTECTION: Prevent AI from responding after manual reply
    // Layer 1 = Race condition backup (< 1 minute)
    // Layer 2 = Smart acknowledgment detection (1-60 minutes)
    // Layer 3 = After 1 hour, AI resumes normally

    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000)      // Layer 1
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)       // Layer 2 & 3

    const { data: recentManualReply } = await supabase
      .from('bot_settings')
      .select('last_manual_reply')
      .eq('customer_phone', customerPhone)
      .single()

    if (recentManualReply?.last_manual_reply) {
      const lastManualTime = new Date(recentManualReply.last_manual_reply)
      const secondsAgo = Math.round((Date.now() - lastManualTime.getTime()) / 1000)
      const minutesAgo = Math.round(secondsAgo / 60)

      // LAYER 1: Critical race condition protection (< 1 minute)
      // Backup check in case outgoing webhook didn't set cooldown yet
      if (lastManualTime > oneMinuteAgo) {
        console.log(`🚨 LAYER 1: Mechanic replied ${secondsAgo} seconds ago - BLOCKING AI (race condition backup)`)
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'blocked',
            layer: 1,
            reason: 'race condition protection',
            seconds_ago: secondsAgo
          })
        }
      }

      // LAYER 2: Within 1 hour - check if conversation ending
      // If customer just says "ok/thanks", don't respond
      if (lastManualTime > oneHourAgo) {
        if (isUselessMessage(customerMessage) || isConversationEnder(customerMessage)) {
          console.log(`💡 LAYER 2: Mechanic replied ${minutesAgo} min ago + customer sent acknowledgment - BLOCKING AI`)
          return {
            statusCode: 200,
            body: JSON.stringify({
              status: 'blocked',
              layer: 2,
              reason: 'conversation ending detected',
              minutes_ago: minutesAgo
            })
          }
        } else {
          // New question within 1 hour - still block (mechanic is handling)
          console.log(`⏸️ LAYER 2: Mechanic replied ${minutesAgo} min ago - Still within 1-hour window, BLOCKING AI`)
          return {
            statusCode: 200,
            body: JSON.stringify({
              status: 'blocked',
              layer: 2,
              reason: 'within 1-hour manual handling window',
              minutes_ago: minutesAgo
            })
          }
        }
      }

      // LAYER 3: After 1 hour - AI resumes normally
      if (minutesAgo >= 60) {
        console.log(`✅ LAYER 3: Mechanic replied ${minutesAgo} min ago (>1 hour) - AI resumes normally`)
      }
    }

    // STRATEGIC DELAY: Wait 1 MINUTE before AI responds
    // This gives mechanic plenty of time to see the message and reply manually
    // If mechanic replies during this window, their webhook will arrive and block AI
    console.log('⏱️ Waiting 1 minute to give mechanic time to reply manually...')
    await sleep(60000) // 60 seconds (1 minute)

    // FINAL VERIFICATION: Check one more time if mechanic replied during the wait
    const { data: finalCheck } = await supabase
      .from('bot_settings')
      .select('last_manual_reply, cooldown_until')
      .eq('customer_phone', customerPhone)
      .single()

    // Check if cooldown was set during the 1-minute wait
    if (finalCheck?.cooldown_until) {
      const cooldownTime = new Date(finalCheck.cooldown_until)
      if (cooldownTime > new Date()) {
        console.log('🛑 Mechanic replied during 1-minute wait - CANCELLING AI response')
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'cancelled',
            reason: 'mechanic took over during delay'
          })
        }
      }
    }

    // Check if mechanic replied in the last 70 seconds (during our wait + buffer)
    if (finalCheck?.last_manual_reply) {
      const lastManualTime = new Date(finalCheck.last_manual_reply)
      const secondsAgo = Math.round((Date.now() - lastManualTime.getTime()) / 1000)
      if (secondsAgo < 70) {
        console.log(`🛑 Mechanic replied ${secondsAgo} seconds ago (during wait) - CANCELLING AI response`)
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'cancelled',
            reason: 'mechanic replied during delay',
            seconds_ago: secondsAgo
          })
        }
      }
    }

    console.log('✅ 1-minute wait complete - No mechanic intervention - AI will respond')

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

        // UPDATE the conversation record with bot reply (don't insert new row)
        if (currentMessageId) {
          await supabase.from('conversations')
            .update({
              bot_reply: aiReply,
              message_type: 'problem'
            })
            .eq('id', currentMessageId)
          console.log('Updated conversation record with bot reply')
        } else {
          // Fallback: insert new record if we don't have the ID
          await supabase.from('conversations').insert({
            customer_phone: customerPhone,
            customer_name: body.pushname || body.name || 'Unknown',
            message: customerMessage,
            bot_reply: aiReply,
            message_type: 'problem',
            is_from_me: false
          })
          console.log('Inserted new conversation record (fallback)')
        }

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
