import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

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

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API Error:', errorData)
      return res.status(response.status).json({ error: errorData })
    }

    const data = await response.json()
    res.json({ message: data.choices[0].message.content })
  } catch (error) {
    console.error('Server error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})
