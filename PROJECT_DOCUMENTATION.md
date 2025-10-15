# JAWIR MOTOR - Project Documentation

## 🎯 Project Overview

**JAWIR MOTOR** is a motorcycle workshop website with an AI-powered WhatsApp chatbot for customer service automation. The system intelligently handles customer inquiries while allowing mechanics to manually take over conversations when needed.

---

## 🏗️ Tech Stack

### **Frontend**
- **React** (Vite) - Modern UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

### **Backend & Services**
- **Netlify** - Hosting & Serverless Functions
- **Supabase** - PostgreSQL database (Backend-as-a-Service)
- **Fonnte API** - WhatsApp Gateway (unofficial WhatsApp API)
- **Claude AI (Anthropic)** - Natural language processing for chatbot responses

### **Deployment**
- **Frontend**: Hosted on Netlify (https://jawirmotor.netlify.app)
- **Custom Domain**: https://jawirmotor.id
- **Serverless Functions**: Netlify Functions (AWS Lambda under the hood)

---

## 📂 Project Structure

```
ReactJawirWeb/
├── src/                          # Frontend React app
│   ├── pages/
│   │   ├── App.jsx              # Main landing page
│   │   ├── AdminLogin.jsx       # Admin authentication
│   │   ├── AdminDashboard.jsx   # Admin dashboard
│   │   ├── PriceMonitoring.jsx  # Price management page
│   │   └── BotControl.jsx       # WhatsApp bot control panel
│   ├── main.jsx                 # React entry point & routing
│   └── index.css                # Global styles
├── netlify/
│   └── functions/
│       └── whatsapp-webhook.js  # Core webhook handler for WhatsApp messages
├── public/                       # Static assets
└── netlify.toml                 # Netlify configuration
```

---

## 🔌 How the System Works

### **1. WhatsApp Message Flow**

```
Customer sends WhatsApp message
         ↓
Fonnte Gateway receives message
         ↓
Fonnte sends webhook POST to Netlify Function
         ↓
whatsapp-webhook.js processes message
         ↓
Checks database (Supabase) for settings/blocks/cooldowns
         ↓
Applies 3-Layer Protection + Strategic Delay
         ↓
Either: AI responds via Claude API + sends via Fonnte
   Or:  Blocks AI (mechanic handling manually)
```

### **2. WhatsApp Gateway (Fonnte)**

**What is Fonnte?**
- Unofficial WhatsApp Business API gateway
- Allows sending/receiving WhatsApp messages programmatically
- **Webhook URL**: `https://jawirmotor.netlify.app/.netlify/functions/whatsapp-webhook`
- **API Endpoint**: `https://api.fonnte.com/send`

**Authentication:**
- Uses API token stored in environment variable: `FONNTE_API_TOKEN`

**Webhook Data Format:**
```javascript
{
  from: "628123456789",           // Customer phone number
  message: "Halo, bisa servis?",  // Message text
  fromMe: false,                   // false = incoming, true = outgoing
  device: "device_name",           // WhatsApp device
  sender: "628123456789"           // Message sender
}
```

### **3. Database (Supabase)**

**Connection:**
- URL: `process.env.SUPABASE_URL`
- Key: `process.env.SUPABASE_ANON_KEY`

**Tables:**

#### **`conversations`**
Stores all WhatsApp message history.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| customer_phone | text | Customer's phone number (62xxx format) |
| customer_message | text | Customer's message content |
| ai_response | text | AI's response |
| created_at | timestamp | Message timestamp |

#### **`blocked_numbers`**
Stores permanently blocked phone numbers (jawir88 command).

| Column | Type | Description |
|--------|------|-------------|
| phone_number | text | Primary key, phone number |
| blocked_by | text | Who blocked: 'admin', 'mechanic', 'customer' |
| created_at | timestamp | When blocked |

#### **`bot_settings`**
Stores per-customer bot behavior settings.

| Column | Type | Description |
|--------|------|-------------|
| customer_phone | text | Primary key, phone number |
| bot_disabled | boolean | Permanent disable flag |
| cooldown_until | timestamp | Bot paused until this time |
| last_manual_reply | timestamp | Last time mechanic replied manually |
| has_greeted | boolean | AI already greeted this customer |

#### **`admin_users`**
Stores admin login credentials.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| username | text | Admin username |
| password | text | Hashed password |

#### **`service_prices`**
Stores workshop service pricing.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| service_name | text | Service type |
| price | integer | Price in IDR |
| description | text | Service description |

---

## 🤖 AI Chatbot Logic

### **Core Protection System**

The bot has **4 layers of protection** to prevent AI from responding after mechanic takes over:

#### **Layer 0: Strategic Delay (1 Minute)**
```javascript
// Wait 60 seconds before AI responds
await sleep(60000)

// This gives mechanic time to:
// 1. See the incoming message notification
// 2. Open WhatsApp
// 3. Send manual reply

// After delay, verify mechanic didn't reply during wait
```

**Purpose:** Gives mechanic full minute to manually intervene before AI responds.

#### **Layer 1: Race Condition Protection (< 1 minute)**
```javascript
if (lastManualTime > oneMinuteAgo) {
  // BLOCK AI - Mechanic just replied seconds ago
  return { status: 'blocked', layer: 1 }
}
```

**Purpose:** Catch race conditions when webhooks arrive out of order.

#### **Layer 2: 1-Hour Cooldown Window (1-60 minutes)**
```javascript
if (lastManualTime > oneHourAgo) {
  // BLOCK ALL AI responses within 1 hour of manual reply
  return { status: 'blocked', layer: 2 }
}
```

**Purpose:** When mechanic manually replies, AI stays quiet for full 1 hour.

#### **Layer 3: After 1 Hour (> 60 minutes)**
```javascript
if (minutesAgo >= 60) {
  // AI resumes normally
  console.log('AI resumes normally')
}
```

**Purpose:** After 1 hour of no mechanic activity, AI resumes automatic responses.

---

## 🔐 Auto-Pause Feature

**Trigger:** When mechanic sends an outgoing WhatsApp message

**Detection:**
```javascript
const isFromMe = body.fromMe === true ||
                 body.from_me === true ||
                 body.direction === 'outgoing'
```

**Action:**
```javascript
// Auto-pause bot for 1 HOUR
const cooldownUntil = new Date(Date.now() + 1 * 60 * 60 * 1000)

await supabase.from('bot_settings').upsert({
  customer_phone: customerPhone,
  cooldown_until: cooldownUntil.toISOString(),
  last_manual_reply: new Date().toISOString()
})
```

**Result:** Bot automatically pauses for 1 hour when mechanic manually replies to any customer.

---

## 📋 Special Commands

### **Customer Commands**

| Command | Action |
|---------|--------|
| `jawir88` | Permanently disable bot for this number |

### **Mechanic Commands (via WhatsApp)**

| Command | Action |
|---------|--------|
| `bot:on <phone>` | Re-enable bot for specific customer |
| `bot:off <phone>` | Pause bot for specific customer |
| `bot:block <phone>` | Permanently block a number |
| `bot:unblock <phone>` | Unblock a number |

---

## 🎛️ Admin Dashboard Features

### **Pages:**

1. **Admin Login** (`/admin`)
   - Username/password authentication
   - Session stored in localStorage

2. **Admin Dashboard** (`/admin/dashboard`)
   - View all conversations
   - Search/filter by phone number
   - Real-time message history

3. **Price Monitoring** (`/admin/prices`)
   - Manage service prices
   - Add/edit/delete services
   - Price displayed to customers via AI

4. **Bot Control** (`/admin/bot-control`)
   - Manual pause/resume bot per customer
   - View blocked numbers list
   - Block/unblock phone numbers
   - Set custom cooldown periods

---

## 🚀 Deployment

### **Environment Variables (Netlify)**

Required environment variables:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...

# Fonnte WhatsApp Gateway
FONNTE_API_TOKEN=your_fonnte_token

# Claude AI
ANTHROPIC_API_KEY=sk-ant-xxx...
```

### **Netlify Configuration**

**Build Settings:**
```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### **Deploy Command:**
```bash
git push origin main  # Auto-deploys to Netlify
```

---

## 🔍 Message Filtering Logic

### **Ignored Message Types:**

1. **Useless Messages**
   - Single emojis: ❤️, 🙏, 👍, etc.
   - Short acknowledgments: "ok", "oke", "k"
   - Just greetings after already greeted

2. **Casual Greetings**
   - "p" (Indonesian slang for "bro")
   - Allows mechanic to build rapport personally

3. **Bad Words / Harassment**
   - Filters offensive language
   - Blocks spam/harassment attempts

4. **Debt Collection**
   - Auto-rejects debt collection messages
   - Prevents spam from collection agencies

### **Instant Responses (No AI Needed):**

1. **Location Request**
   - Detects: "lokasi", "alamat", "dimana"
   - Response: "Tunggu ya, nanti akan di-share lokasi nya 📍"

2. **Operating Hours Request**
   - Detects: "jam buka", "buka jam berapa"
   - Sends formatted schedule immediately

---

## 🧠 AI Integration (Claude)

### **Model Used:**
- **claude-3-5-sonnet-20241022**
- Temperature: 0.7 (balanced creativity/accuracy)

### **System Prompt:**
```
You are a helpful assistant for JAWIR MOTOR motorcycle workshop.

Workshop Info:
- Location: [fetched from database]
- Operating Hours: [fetched from database]
- Services & Prices: [fetched from database]

Personality:
- Casual, friendly Indonesian slang
- Use "gw/lu" instead of "saya/anda"
- Helpful but relaxed tone
```

### **Message Format:**
```javascript
{
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 500,
  temperature: 0.7,
  system: systemPrompt,
  messages: [
    { role: "user", content: customerMessage }
  ]
}
```

---

## 📊 Conversation History

**Storage:** All conversations stored in `conversations` table

**Retrieval:**
```javascript
const { data } = await supabase
  .from('conversations')
  .select('*')
  .order('created_at', { ascending: false })
```

**Display:** Admin dashboard shows all conversations with timestamps, phone numbers, and full message history.

---

## 🐛 Known Issues & Solutions

### **Issue 1: Webhooks Arriving Out of Order**
- **Problem:** Fonnte webhooks may arrive with 5-30 second delays
- **Solution:** 1-minute strategic delay + 3-layer protection system

### **Issue 2: AI Responding After Manual Reply**
- **Problem:** Race conditions causing AI to respond even after mechanic replies
- **Solution:**
  - 60-second delay before AI responds
  - Final verification check after delay
  - 70-second check window (60s + 10s buffer)
  - Auto-pause on outgoing messages

### **Issue 3: Blocked Numbers Not Showing**
- **Problem:** Supabase `.order()` failing on null `created_at`
- **Solution:** Remove SQL sorting, sort in JavaScript, handle nulls gracefully

---

## 🔧 Maintenance & Updates

### **To Update Bot Logic:**
1. Edit `netlify/functions/whatsapp-webhook.js`
2. Commit and push to GitHub
3. Netlify auto-deploys in ~2 minutes

### **To Update Frontend:**
1. Edit files in `src/`
2. Commit and push
3. Netlify rebuilds and deploys

### **To Update Database Schema:**
1. Go to Supabase dashboard
2. Use SQL Editor or Table Editor
3. Changes are instant (no deployment needed)

---

## 📞 Support & Contact

**Workshop:**
- Website: https://jawirmotor.id
- WhatsApp: [Integrated via Fonnte]

**Tech Stack Documentation:**
- React: https://react.dev
- Netlify: https://docs.netlify.com
- Supabase: https://supabase.com/docs
- Fonnte: https://docs.fonnte.com
- Claude AI: https://docs.anthropic.com

---

## 🎯 Future Improvements

**Potential Features:**
- [ ] Multi-language support (English + Indonesian)
- [ ] Voice message transcription
- [ ] Image recognition for damage assessment
- [ ] Booking system integration
- [ ] Customer feedback collection
- [ ] Analytics dashboard (message volume, response times)
- [ ] WhatsApp broadcast for promotions
- [ ] Integration with Google Calendar for appointments

---

## 📝 Quick Reference for AI Prompting

**When explaining this project to Claude/Gemini, say:**

> "This is a motorcycle workshop website with a WhatsApp chatbot. Frontend is React on Netlify. Backend uses Netlify Functions + Supabase PostgreSQL. WhatsApp integration via Fonnte API gateway. AI responses powered by Claude. The bot has a 4-layer protection system: 1-minute strategic delay, race condition protection, 1-hour cooldown window, and auto-pause when mechanics send manual messages. All conversations stored in Supabase. Admin dashboard for manual control."

**Key Files to Mention:**
- `netlify/functions/whatsapp-webhook.js` - Core bot logic
- `src/pages/BotControl.jsx` - Admin control panel
- Supabase tables: `conversations`, `blocked_numbers`, `bot_settings`

**Environment Variables Needed:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `FONNTE_API_TOKEN`
- `ANTHROPIC_API_KEY`

---

**Last Updated:** 2025-10-15
**Version:** 1.0
**Author:** JAWIR MOTOR Development Team
