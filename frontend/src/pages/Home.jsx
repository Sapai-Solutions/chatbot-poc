/**
 * Home.jsx — Landing page for Chatbot POC
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'

import { getHealth } from '../api'

export default function Home() {
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState(false)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealthError(true))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">

      <motion.div
        className="text-center max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }}
      >
        <img src="/logo.png" alt="Aras Integrasi" className="w-14 h-14 mx-auto mb-8" />

        <h1 className="text-4xl font-bold tracking-tight mb-3 text-foreground">
          AI Chatbot
        </h1>

        <p className="text-base mb-8 text-muted-foreground">
          A production-ready AI chatbot starter template with LangGraph integration.
          Features streaming responses, session management, and tool calling.
        </p>

        {/* Status */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {health ? (
            <span className="badge badge-green">Backend connected</span>
          ) : healthError ? (
            <span className="badge badge-red">Backend unreachable</span>
          ) : (
            <span className="badge badge-neutral">Checking backend...</span>
          )}
        </motion.div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/chat" className="btn-primary text-sm px-5 py-2.5">
            Start Chatting
          </Link>
          <Link to="/design-system" className="btn-secondary text-sm px-5 py-2.5">
            Design System
          </Link>
        </div>
      </motion.div>

      <motion.p
        className="mt-16 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Built with aras-fullstack-template · Aras Integrasi
      </motion.p>
    </div>
  )
}
