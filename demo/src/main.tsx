import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureKState } from 'kstate'
import App from './App'
import './styles.css'

// Configure KState with JSONPlaceholder API
configureKState({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  onError: (error, operation, meta) => {
    console.error(`[KState Global] ${operation} failed:`, error.message, meta)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
