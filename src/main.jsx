import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './app.css'
import App from './App.jsx'
import { setBackgroundAverage } from './photo-calendar/index.js'
import { registerServiceWorker } from './pwa/register.js'

// The early-paint script in index.html left the wallpaper's remembered average colour on window. Hand it
// to the page now, before the first render, so text colours and the readability veil are right from
// the first frame instead of changing when the wallpaper image arrives.
const remembered = window.__wallpaper
if (remembered?.average) setBackgroundAverage(remembered.average)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
