import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Disable mouse wheel increment/decrement for all number inputs globally
document.addEventListener('wheel', function(e) {
  if (document.activeElement.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: false });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
