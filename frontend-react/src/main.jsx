import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../static/base/assets/css/style-base.css'
import './base-fonts.css'
import './index.css'
import App from './App.jsx'
import { trackAttributedPageView } from './features/articles/services/articleAnalytics.js'

trackAttributedPageView()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
