// WhatsApp Webhook - Fonnte Integration with OpenAI ChatGPT
// This receives messages from Fonnte, sends to OpenAI, and replies back

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

Example conversation:
Customer: "Motor saya berisik"
You: "Halo! Terima kasih sudah menghubungi JAWIR MOTOR. Motor apa yang Bapak/Ibu pakai? (misalnya Honda Beat, Yamaha NMAX, dll.)"

Customer: "Honda Beat"
You: "Baik, Honda Beat ya. Bunyi berisiknya seperti apa dan datang dari mana? Dari mesin, rantai, atau bagian lain? Dan biasanya terjadi kapan?"

Customer: "Bunyi dari mesin, waktu gas ditarik"
You: "Untuk Honda Beat dengan gejala bunyi dari mesin saat gas ditarik, kemungkinan penyebabnya:
1. Masalah pada sistem pembakaran atau busi
2. CVT atau V-belt yang mulai aus
3. Oli mesin yang perlu diganti

Namun, saya TIDAK merekomendasikan untuk memperbaiki sendiri karena:
- Butuh alat khusus untuk membuka dan mengecek CVT
- Salah diagnosa bisa membuat kerusakan lebih parah
- Penyetelan yang tidak tepat bisa berbahaya saat berkendara

Saya sangat menyarankan Bapak/Ibu untuk membawa motor ke bengkel JAWIR MOTOR. Mekanik profesional kami akan melakukan pengecekan menyeluruh dengan peralatan yang tepat. Kapan Bapak/Ibu bisa datang ke bengkel?"

Always follow this pattern!`

// Store conversation history per customer (in-memory, simple version)
// For production, use a database like Firebase or Supabase
const conversationHistory = {}

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

    // Log the FULL webhook payload to see what Fonnte sends
    console.log('FULL WEBHOOK PAYLOAD:', JSON.stringify(body, null, 2))

    // Extract data from Fonnte webhook
    const customerPhone = body.device || body.from
    const customerMessage = body.message || body.text
    const isFromMe = body.fromMe === true || body.from_me === true

    console.log('Extracted data:', { customerPhone, customerMessage, isFromMe })

    // Ignore messages from ourselves (when mechanic replies manually)
    if (isFromMe) {
      console.log('Message from mechanic, bot stays quiet')
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ignored', reason: 'message from mechanic' })
      }
    }

    // Ignore empty messages
    if (!customerMessage || !customerMessage.trim()) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ignored', reason: 'empty message' })
      }
    }

    // Get or initialize conversation history for this customer
    if (!conversationHistory[customerPhone]) {
      conversationHistory[customerPhone] = []
    }

    // Add customer message to history
    conversationHistory[customerPhone].push({
      role: 'user',
      content: customerMessage
    })

    // Keep only last 10 messages to avoid token limits
    if (conversationHistory[customerPhone].length > 10) {
      conversationHistory[customerPhone] = conversationHistory[customerPhone].slice(-10)
    }

    // Get OpenAI API key
    const openaiApiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY

    if (!openaiApiKey) {
      console.error('OpenAI API key not found')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      }
    }

    // Call OpenAI ChatGPT API
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
      const errorData = await openaiResponse.json().catch(() => ({}))
      console.error('OpenAI API error:', openaiResponse.status, errorData)
      throw new Error('OpenAI API error')
    }

    const openaiData = await openaiResponse.json()
    const aiReply = openaiData.choices[0].message.content

    // Add AI reply to conversation history
    conversationHistory[customerPhone].push({
      role: 'assistant',
      content: aiReply
    })

    // Send reply back to customer via Fonnte
    const fonntToken = process.env.FONNTE_API_TOKEN

    if (!fonntToken) {
      console.error('Fonnte API token not found')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Fonnte token not configured' })
      }
    }

    // Log what we're sending to Fonnte
    const fonnePayload = {
      target: customerPhone,
      message: aiReply,
      countryCode: '62'
    }
    console.log('Sending to Fonnte:', fonnePayload)

    const fonneResponse = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonntToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fonnePayload)
    })

    const fonneData = await fonneResponse.json().catch(() => ({}))
    console.log('Fonnte response status:', fonneResponse.status)
    console.log('Fonnte response data:', fonneData)

    if (!fonneResponse.ok) {
      console.error('Fonnte API error:', fonneResponse.status, fonneData)
      throw new Error(`Fonnte API error: ${JSON.stringify(fonneData)}`)
    }

    console.log('Reply sent successfully to:', customerPhone)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'success',
        reply: aiReply
      })
    }

  } catch (error) {
    console.error('Webhook error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    }
  }
}
