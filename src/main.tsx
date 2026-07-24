import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept background Firebase unhandled rejections (such as invalid API key or offline errors)
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const errorStr = String(event.reason?.message || event.reason?.code || event.reason || "");
    if (
      errorStr.includes("api-key-not-valid") ||
      errorStr.includes("API key") ||
      errorStr.includes("auth/api-key-not-valid") ||
      errorStr.includes("auth/invalid-api-key")
    ) {
      console.warn("Handled background Firebase auth notice:", event.reason);
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
