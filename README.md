# JAWIR MOTOR - Motorcycle Workshop Website

A modern, mobile-friendly React website for JAWIR MOTOR motorcycle workshop with an AI-powered chat assistant.

## Features

- Clean and modern design with Tailwind CSS
- AI-powered chatbot for customer motorcycle issue consultation
- Mobile-responsive layout
- Built with React + Vite for fast development

## Project Structure

```
ReactJawirWeb/
├── src/
│   ├── components/
│   │   └── ChatBox.jsx          # Chat interface component
│   ├── services/
│   │   └── openai.js            # OpenAI API integration (placeholder)
│   ├── App.jsx                  # Main application component
│   ├── main.jsx                 # Application entry point
│   └── index.css                # Tailwind CSS imports
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. **IMPORTANT**: The `.env` file with your API key is already configured. Make sure it exists in the root directory.

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## OpenAI API Integration

✅ **The OpenAI API is fully integrated and ready to use!**

The chatbot is now connected to OpenAI's GPT-3.5-turbo model. Your API key is securely stored in the `.env` file.

### How It Works

1. User messages are sent to the OpenAI API
2. The AI acts as a friendly motorcycle mechanic assistant
3. Responses are in Indonesian (Bahasa Indonesia)
4. The AI always recommends visiting JAWIR MOTOR for proper inspection

### Security Note

**IMPORTANT**:
- Your API key is stored in the `.env` file
- The `.env` file is already added to `.gitignore` to prevent accidental commits
- **NEVER** share your `.env` file or commit it to version control
- If you need to deploy this, make sure to add the environment variable to your hosting platform

### Alternative: Backend API (Recommended for Production)

For better security in production, it's recommended to call OpenAI through your own backend server instead of directly from the frontend. A placeholder function `sendMessageToBackend()` is provided in `src/services/openai.js`.

This prevents exposing your API key in the frontend code.

## Customization

### Change Logo

Replace the placeholder SVG icon in `src/App.jsx` (lines 11-24) with your own logo image:

```jsx
<img src="/path/to/your/logo.png" alt="JAWIR MOTOR Logo" className="w-24 h-24" />
```

### Modify Styling

The project uses Tailwind CSS. You can:
- Modify colors and spacing directly in JSX using Tailwind classes
- Extend the theme in `tailwind.config.js`
- Add custom CSS in `src/index.css`

### Update AI Behavior

Modify the system prompt in `src/services/openai.js` to change how the AI assistant responds to customers.

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **OpenAI API** - AI chatbot (placeholder for now)

## License

This project is created for JAWIR MOTOR workshop.

## Support

For issues or questions, please contact the development team.
