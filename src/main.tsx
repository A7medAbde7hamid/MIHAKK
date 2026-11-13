import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './dark-theme.css'
import './kinetic-theme.css'
import './layout-theme.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch(error => console.error('MIHAKK offline support could not start:', error))
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
