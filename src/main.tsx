import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')

try {
  createRoot(rootEl).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  )
} catch (err) {
  // Show a readable error instead of a black screen
  rootEl.innerHTML = `
    <div style="min-height:100vh;background:#0f0f0f;color:#f5f5f5;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;font-family:system-ui;text-align:center">
      <p style="font-size:2rem;margin-bottom:1rem">⚠️</p>
      <p style="font-weight:bold;margin-bottom:0.5rem">App failed to start</p>
      <p style="color:#6b7280;font-size:0.875rem;max-width:320px">${err instanceof Error ? err.message : String(err)}</p>
    </div>
  `
}
