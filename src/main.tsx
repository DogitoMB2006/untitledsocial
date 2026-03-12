import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/notifications-sw.js')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationsProvider>
        <App />
        <ToastContainer
          position="top-right"
          autoClose={5000}
          newestOnTop
          closeOnClick
          draggable={false}
          hideProgressBar={false}
          theme="dark"
          limit={4}
          stacked
          style={{ zIndex: 20000 }}
          toastStyle={{ width: 360, padding: 0 }}
          toastClassName={() =>
            'rounded-2xl border border-sky-500/25 bg-slate-950/95 text-slate-50 shadow-xl shadow-black/40 backdrop-blur-md'
          }
          progressClassName="bg-gradient-to-r from-sky-400 via-blue-500 to-sky-300"
        />
      </NotificationsProvider>
    </AuthProvider>
  </StrictMode>,
)
