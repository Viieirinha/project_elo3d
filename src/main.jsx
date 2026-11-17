import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './utils/AuthContext.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { getTheme, applyTheme } from './utils/theme.js'
import './index.css'

applyTheme(getTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
