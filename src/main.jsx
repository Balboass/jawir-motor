import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import PriceMonitoring from './pages/PriceMonitoring.jsx'
import BotControl from './pages/BotControl.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/prices" element={<PriceMonitoring />} />
        <Route path="/admin/bot-control" element={<BotControl />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
