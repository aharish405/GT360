import React, { useState, useEffect } from 'react'
import SIMSearch from './components/SIMSearch'
import Devices from './components/Devices'

function App() {
  const [activeTab, setActiveTab] = useState('search');

  useEffect(() => {
    // Check if we are returning from Wialon auth (token in URL)
    const hasToken = window.location.hash.includes('access_token') || 
                     window.location.search.includes('access_token');
    
    if (hasToken) {
      setActiveTab('devices');
    }
  }, []);

  return (
    <div className="app-wrapper">
      <header className="header container">
        <h1 className="logo">Geotrax360</h1>
        <p className="subtitle">
          {activeTab === 'search' ? 'SIM Inventory Management' : 'Device Tracking Status'}
        </p>
      </header>

      <main className="container animate-fade" key={activeTab}>
        {activeTab === 'search' ? <SIMSearch /> : <Devices />}
      </main>

      <footer className="footer">
        <button 
          className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          {/* Minimalist SIM Icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path>
            <rect x="6" y="9" width="4" height="6" rx="0.5"></rect>
          </svg>
          <span>SIM Search</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          {/* Minimalist Navigation Arrow */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l19-9-9 19-2-8-8-2z"></path>
          </svg>
          <span>Device Tracking</span>
        </button>
        <button className="nav-item disabled">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
          </svg>
          <span>Status</span>
        </button>
      </footer>
    </div>
  )
}

export default App
