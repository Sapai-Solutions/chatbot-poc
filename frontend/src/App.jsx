import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Chat from './pages/Chat'
import Home from './pages/Home'
import DesignSystem from './pages/template/DesignSystem'

// Add your routes here as you build out the app.
// Example:
//   import Dashboard from './pages/Dashboard'
//   <Route path="/dashboard" element={<Dashboard />} />
//
// Template routes (/design-system) can be removed before production.

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/home" element={<Home />} />
        <Route path="/design-system" element={<DesignSystem />} />
      </Routes>
    </BrowserRouter>
  )
}
