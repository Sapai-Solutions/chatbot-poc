/**
 * Home.jsx — Starter page for your application.
 *
 * REPLACE THIS with your actual landing page.
 * Visit /design-system for the full design reference while building.
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--color-ink)' }}>

      <motion.div
        className="text-center max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }}
      >
        <img src="/logo.png" alt="Aras Integrasi" className="w-14 h-14 mx-auto mb-8" />

        <h1 className="text-4xl font-bold tracking-tight mb-3"
          style={{ color: 'var(--color-snow)' }}>
          KPDN Tribunal Transcriber
        </h1>

        <p className="text-base mb-8" style={{ color: 'var(--color-snow-muted)' }}>
          Your application starts here. Replace this page with your actual content.
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
          <a href="/docs" className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2" target="_blank" rel="noopener noreferrer">
            API Docs
          </a>
          <Link to="/design-system" className="btn-secondary text-sm px-5 py-2.5 inline-flex items-center gap-2">
            Design System
          </Link>
        </div>
      </motion.div>

      <motion.p
        className="mt-16 text-xs"
        style={{ color: 'var(--color-snow-faint)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Built with aras-fullstack-template
      </motion.p>
    </div>
  )
}
