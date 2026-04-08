import { ClerkProvider } from '@clerk/clerk-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { clerkPublishableKey, isClerkAuthEnabled } from './config/clerk'
import './index.css'
import App from './App.tsx'

const key = clerkPublishableKey()
const clerkOn = isClerkAuthEnabled()

const app = (
  <StrictMode>
    {clerkOn && key ? (
      <ClerkProvider publishableKey={key}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>
)

createRoot(document.getElementById('root')!).render(app)
