import React, { useState, useMemo, useEffect } from 'react';
import inventoryData from '../data/inventory.json';

const HighlightEndMatch = ({ text, match }) => {
  if (!match || !text) return <>{text}</>;
  const str = text.toString();
  if (str.endsWith(match)) {
    const prefix = str.slice(0, -match.length);
    const suffix = str.slice(-match.length);
    return (
      <>
        <span style={{ opacity: 0.55 }}>{prefix}</span>
        <mark className="match-highlight">{suffix}</mark>
      </>
    );
  }
  const idx = str.indexOf(match);
  if (idx !== -1) {
    return (
      <>
        <span style={{ opacity: 0.7 }}>{str.slice(0, idx)}</span>
        <mark className="match-highlight">{str.slice(idx, idx + match.length)}</mark>
        <span style={{ opacity: 0.7 }}>{str.slice(idx + match.length)}</span>
      </>
    );
  }
  return <>{text}</>;
};

const SIMSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'compact'
  const [expandedIds, setExpandedIds] = useState({});
  const [visibleCount, setVisibleCount] = useState(10);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Filter inventory
  const results = useMemo(() => {
    if (searchTerm.length < 4) return [];
    return inventoryData.filter(item => 
      (item.SIM_NO && item.SIM_NO.toString().endsWith(searchTerm)) ||
      (item.MOBILE_NUMBER && item.MOBILE_NUMBER.toString().endsWith(searchTerm))
    );
  }, [searchTerm]);

  // Reset pagination and expand states on search change
  useEffect(() => {
    setVisibleCount(10);
    setExpandedIds({});
  }, [searchTerm]);

  // Listen to scroll for "Back to top"
  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 320);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCopy = (number, id) => {
    const formatted = `+91${number}`;
    navigator.clipboard.writeText(formatted).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleExpand = (idx) => {
    setExpandedIds(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayedResults = useMemo(() => {
    return results.slice(0, visibleCount);
  }, [results, visibleCount]);

  const hasMore = visibleCount < results.length;
  const remainingCount = Math.max(0, results.length - visibleCount);

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
            placeholder="Search SIM or Mobile Last Digits" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.replace(/\D/g, ''))}
            className="search-input"
            maxLength={20}
          />
          {searchTerm && (
            <button 
              className="clear-btn" 
              onClick={() => setSearchTerm('')} 
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Results Header & Density Controls */}
      {results.length > 0 && (
        <div className="search-toolbar animate-fade">
          <div className="results-badge">
            <span className="count-highlight">{results.length}</span>
            <span>{results.length === 1 ? 'SIM Found' : 'SIMs Found'}</span>
            {results.length > 10 && (
              <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>
                • Showing {displayedResults.length}
              </span>
            )}
          </div>

          <div className="view-toggle-group">
            <button 
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Cards View"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="7" rx="2"></rect>
                <rect x="3" y="14" width="18" height="7" rx="2"></rect>
              </svg>
              <span>Cards</span>
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => setViewMode('compact')}
              title="Compact View for scale"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              <span>Compact</span>
            </button>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="results-container">
        {viewMode === 'cards' ? (
          // Full Cards Presentation
          displayedResults.map((item, idx) => (
            <div key={idx} className="result-item animate-fade">
              <div className="result-header">
                <div className="mobile-row">
                  <span className="label-ios">Mobile Number</span>
                  <span className="value-ios">
                    <HighlightEndMatch text={item.MOBILE_NUMBER} match={searchTerm} />
                  </span>
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
                  <span className="value-small">
                    <HighlightEndMatch text={item.SIM_NO} match={searchTerm} />
                  </span>
                </div>
                <div className="detail-col">
                  <span className="label-small">IMSI</span>
                  <span className="value-small">{item.SIM_IMSI || 'N/A'}</span>
                </div>
                {(item.ACCOUNT || item.account) && (
                  <div className="detail-col">
                    <span className="label-small">Account</span>
                    <span className="value-small">{item.ACCOUNT || item.account}</span>
                  </div>
                )}
                {(item.CREATOR || item.creator) && (
                  <div className="detail-col">
                    <span className="label-small">Creator</span>
                    <span className="value-small">{item.CREATOR || item.creator}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          // Compact List View for High Density & Mobile Scaling
          displayedResults.map((item, idx) => {
            const isExpanded = !!expandedIds[idx];
            return (
              <div key={idx} className="compact-card animate-fade">
                <div className="compact-main-row" onClick={() => toggleExpand(idx)}>
                  <div className="compact-info">
                    <div className="compact-primary">
                      <HighlightEndMatch text={item.MOBILE_NUMBER} match={searchTerm} />
                    </div>
                    <div className="compact-secondary">
                      <span>SIM:</span>
                      <span><HighlightEndMatch text={item.SIM_NO} match={searchTerm} /></span>
                    </div>
                  </div>

                  <div className="compact-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="compact-copy-btn"
                      onClick={() => handleCopy(item.MOBILE_NUMBER, idx)}
                    >
                      {copiedId === idx ? 'Copied' : 'Copy'}
                    </button>
                    <button 
                      className={`compact-expand-btn ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleExpand(idx)}
                      aria-label="Toggle details"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '14px', height: '14px'}}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="compact-drawer">
                    <div className="details-grid" style={{ paddingTop: '0.75rem' }}>
                      <div className="detail-col">
                        <span className="label-small">IMSI</span>
                        <span className="value-small">{item.SIM_IMSI || 'N/A'}</span>
                      </div>
                      <div className="detail-col">
                        <span className="label-small">SIM Full</span>
                        <span className="value-small" style={{ fontSize: '0.8rem' }}>{item.SIM_NO}</span>
                      </div>
                      {(item.ACCOUNT || item.account) && (
                        <div className="detail-col">
                          <span className="label-small">Account</span>
                          <span className="value-small">{item.ACCOUNT || item.account}</span>
                        </div>
                      )}
                      {(item.CREATOR || item.creator) && (
                        <div className="detail-col">
                          <span className="label-small">Creator</span>
                          <span className="value-small">{item.CREATOR || item.creator}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Scalable Pagination / Progressive Loading */}
        {results.length > 10 && (
          <div className="pagination-wrapper">
            {hasMore ? (
              <button 
                className="load-more-btn"
                onClick={() => setVisibleCount(prev => Math.min(prev + 10, results.length))}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '16px', height: '16px'}}>
                  <polyline points="7 13 12 18 17 13"></polyline>
                  <polyline points="7 6 12 11 17 6"></polyline>
                </svg>
                <span>Load 10 More ({remainingCount} remaining)</span>
              </button>
            ) : (
              <div className="pagination-summary" style={{ textAlign: 'center', padding: '0.5rem' }}>
                All {results.length} results loaded
              </div>
            )}
          </div>
        )}

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

      {/* Floating Back to Top Button on Mobile */}
      {showScrollTop && (
        <button 
          className="back-to-top-btn"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
          <span>Top</span>
        </button>
      )}
    </div>
  );
};

export default SIMSearch;
