import React, { useState, useMemo } from 'react';
import inventoryData from '../data/inventory.json';

const SIMSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  
  const results = useMemo(() => {
    if (searchTerm.length < 4) return [];
    return inventoryData.filter(item => 
      item.SIM_NO && item.SIM_NO.toString().endsWith(searchTerm)
    );
  }, [searchTerm]);

  const handleCopy = (number, id) => {
    const formatted = `+91${number}`;
    navigator.clipboard.writeText(formatted).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="search-module animate-fade">
      <div className="search-card">
        <div className="input-group">
          <div className="search-icon-svg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input 
            type="tel" 
            placeholder="Search SIM Last Digits" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.replace(/\D/g, ''))}
            className="search-input"
            maxLength={20}
          />
        </div>
      </div>

      <div className="results-container">
        {results.map((item, idx) => (
          <div key={idx} className="result-item">
            <div className="result-header">
              <div className="mobile-row">
                <span className="label-ios">Mobile Number</span>
                <span className="value-ios">{item.MOBILE_NUMBER}</span>
              </div>
              <button 
                className="copy-btn"
                onClick={() => handleCopy(item.MOBILE_NUMBER, idx)}
              >
                {copiedId === idx ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '1rem', height: '1rem'}}>
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '1rem', height: '1rem'}}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="details-grid">
              <div className="detail-col">
                <span className="label-small">SIM Number</span>
                <span className="value-small">{item.SIM_NO}</span>
              </div>
              <div className="detail-col">
                <span className="label-small">IMSI</span>
                <span className="value-small">{item.SIM_IMSI || 'N/A'}</span>
              </div>
            </div>
          </div>
        ))}

        {searchTerm.length >= 4 && results.length === 0 && (
          <div style={{padding: '2rem', textAlign: 'center', color: 'var(--text-muted)'}}>
            No results found
          </div>
        )}
      </div>

      {!searchTerm && (
        <div style={{marginTop: '4rem', textAlign: 'center', opacity: 0.3}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{width: '4rem', height: '4rem', marginBottom: '1rem'}}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p style={{fontSize: '0.9rem', fontWeight: 500}}>Enter SIM digits to begin</p>
        </div>
      )}
    </div>
  );
};

export default SIMSearch;
