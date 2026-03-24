import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Chat from './pages/Chat'
import Home from './pages/Home'
import KnowledgeBase from './pages/KnowledgeBase'
import DesignSystem from './pages/template/DesignSystem'

// Add your routes here as you build out the app.
// Template routes (/design-system) can be removed before production.

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/home" element={<Home />} />
        <Route path="/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/design-system" element={<DesignSystem />} />
      </Routes>
    </BrowserRouter>
  )
}
