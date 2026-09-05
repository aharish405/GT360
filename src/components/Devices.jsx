import React, { useState, useEffect, useMemo } from 'react';

const WIALON_LOGIN_URL = 'https://hosting.wialon.com/login.html';
const WIALON_API_URL = 'https://hst-api.wialon.com/wialon/ajax.html';

const jsonpRequest = (svc, params, sid) => {
  return new Promise((resolve, reject) => {
    const callbackName = 'wialon_cb_' + Math.random().toString(36).substring(7);
    const url = `${WIALON_API_URL}?svc=${svc}&params=${encodeURIComponent(JSON.stringify(params))}${sid ? `&sid=${sid}` : ''}&callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = url;
    window[callbackName] = (data) => {
      delete window[callbackName];
      document.body.removeChild(script);
      if (data && data.error) reject(new Error(`Wialon Error ${data.error}`));
      else resolve(data);
    };
    script.onerror = () => {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('Network failure'));
    };
    document.body.appendChild(script);
  });
};

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sid, setSid] = useState(localStorage.getItem('wialon_sid') || null);

  const [usersMap, setUsersMap] = useState({});
  const [accountsMap, setAccountsMap] = useState({});

  const mappedDevices = useMemo(() => {
    return devices.map(item => {
        const raw = item; // Using direct JSON result
        const lmsg = raw.lmsg || {};
        const pNode = lmsg.p || {};
        const pflds = raw.pflds || {};
        const flds = raw.flds || {};
        const aflds = raw.aflds || {};
        const pos = raw.pos || {};
        
        const name = raw.nm || 'Unknown';
        const imei = raw.uid || pNode.imei || raw.uid2 || 'N/A';
        
        let phone = raw.ph || pNode.phone || pNode.mobile || 'N/A';
        if (phone === 'N/A') {
            const phoneField = Object.values(flds).find(f => f.n?.toLowerCase() === 'phone' || f.n?.toLowerCase() === 'mobile');
            if (phoneField) phone = phoneField.v;
        }

        const netConn = raw.netConn;
        const fct = raw.fct;
        const msgT = lmsg.t || 0;
        const isRecent = msgT > (Date.now() / 1000 - 1800); 
        const isOnline = (netConn === 1 || netConn === 3) || (fct === 1) || isRecent;

        const model = Object.values(pflds).find(f => f.n?.toLowerCase() === 'model')?.v || '';
        const hwType = Object.values(pflds).find(f => f.n?.toLowerCase() === 'device_type')?.v || '';
        const vin = Object.values(pflds).find(f => f.n?.toLowerCase() === 'vin')?.v || '';

        // Resolve Creator Name
        const allCustomFields = [...Object.values(flds), ...Object.values(pflds), ...Object.values(aflds)];
        const creatorFromField = allCustomFields.find(f => f.n?.toLowerCase() === 'creator' || f.n?.toLowerCase() === 'creator name')?.v;
        const creator = raw.rel_user_creator_name || 
                        raw.creator_name || 
                        raw.creator || 
                        (raw.crt && usersMap[raw.crt]) || 
                        creatorFromField || 
                        (raw.crt ? `User #${raw.crt}` : 'N/A');

        // Resolve Account Name
        const accountFromField = allCustomFields.find(f => f.n?.toLowerCase() === 'account' || f.n?.toLowerCase() === 'account name')?.v;
        const account = raw.rel_billing_account_name || 
                        raw.account_name || 
                        raw.account || 
                        (raw.bact && accountsMap[raw.bact]) || 
                        accountFromField || 
                        (raw.bact ? `Account #${raw.bact}` : 'N/A');

        const lastMsgTime = msgT 
            ? new Date(msgT * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
            : 'No Data';

        // Telemetry
        const lat = pos.y ? pos.y.toFixed(6) : null;
        const lng = pos.x ? pos.x.toFixed(6) : null;
        const speed = pos.s || 0;
        const alt = pos.z || 0;
        const course = pos.c || 0;

        // Custom properties extraction
        const customFields = Object.values(flds).map(f => ({ label: f.n, value: f.v }));

        return { 
            id: raw.id, 
            name, 
            imei, 
            phone, 
            model, 
            hwType,
            vin,
            creator,
            account,
            isOnline, 
            lastMsg: lastMsgTime, 
            lat, 
            lng,
            speed,
            alt,
            course,
            customFields
        };
    });
  }, [devices, usersMap, accountsMap]);

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'offline'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'compact'
  const [expandedIds, setExpandedIds] = useState({});
  const [visibleCount, setVisibleCount] = useState(10);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const filteredDevices = useMemo(() => {
    if (searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return mappedDevices.filter(d => 
        d.name.toLowerCase().includes(term) ||
        d.imei.toString().toLowerCase().includes(term) ||
        d.phone.toString().toLowerCase().includes(term) ||
        (d.vin && d.vin.toLowerCase().includes(term)) ||
        (d.account && d.account.toLowerCase().includes(term)) ||
        (d.creator && d.creator.toLowerCase().includes(term))
    );
  }, [mappedDevices, searchTerm]);

  // Status-based filter
  const statusFilteredDevices = useMemo(() => {
    if (statusFilter === 'active') return filteredDevices.filter(d => d.isOnline);
    if (statusFilter === 'offline') return filteredDevices.filter(d => !d.isOnline);
    return filteredDevices;
  }, [filteredDevices, statusFilter]);

  const activeCount = useMemo(() => filteredDevices.filter(d => d.isOnline).length, [filteredDevices]);
  const offlineCount = useMemo(() => filteredDevices.length - activeCount, [filteredDevices, activeCount]);

  // Reset pagination on search or filter change
  useEffect(() => {
    setVisibleCount(10);
    setExpandedIds({});
  }, [searchTerm, statusFilter]);

  // Scroll listener for "Back to top"
  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 320);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleExpand = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayedDevices = useMemo(() => {
    return statusFilteredDevices.slice(0, visibleCount);
  }, [statusFilteredDevices, visibleCount]);

  const hasMore = visibleCount < statusFilteredDevices.length;
  const remainingCount = Math.max(0, statusFilteredDevices.length - visibleCount);

  const fetchDevices = async (currentSid) => {
    setLoading(true);
    try {
        const params = {
            spec: {
                itemsType: "avl_unit",
                propName: "sys_name",
                propValueMask: "*",
                sortType: "sys_name"
            },
            force: 1,
            // Enhanced Flags: 1(Base), 2(Admin), 8(Msg), 256(Pos), 1024(Custom Props), 4096(Admin Fields), 4194304(Network), 4(flds)
            flags: 1 | 2 | 4 | 8 | 256 | 1024 | 4096 | 4194304,
            from: 0,
            to: 0
        };

        const [unitRes, usersRes, accountsRes] = await Promise.allSettled([
            jsonpRequest("core/search_items", params, currentSid),
            jsonpRequest("core/search_items", {
                spec: { itemsType: "user", propName: "sys_name", propValueMask: "*", sortType: "sys_name" },
                force: 1,
                flags: 1,
                from: 0,
                to: 0
            }, currentSid),
            jsonpRequest("core/search_items", {
                spec: { itemsType: "avl_resource", propName: "sys_name", propValueMask: "*", sortType: "sys_name" },
                force: 1,
                flags: 1,
                from: 0,
                to: 0
            }, currentSid)
        ]);

        if (unitRes.status === 'fulfilled') {
            setDevices(unitRes.value.items || []);
            setError(null);
        } else {
            throw unitRes.reason;
        }

        if (usersRes.status === 'fulfilled' && usersRes.value?.items) {
            const uMap = {};
            usersRes.value.items.forEach(u => {
                if (u.id && u.nm) uMap[u.id] = u.nm;
            });
            setUsersMap(uMap);
        }

        if (accountsRes.status === 'fulfilled' && accountsRes.value?.items) {
            const aMap = {};
            accountsRes.value.items.forEach(a => {
                if (a.id && a.nm) aMap[a.id] = a.nm;
            });
            setAccountsMap(aMap);
        }
    } catch (err) {
        if (err?.message?.includes('Error 1')) {
            setSid(null);
            localStorage.removeItem('wialon_sid');
        }
        setError("Session expired or sync failed.");
    } finally {
        setLoading(false);
    }
  };

  const handleWialonLogin = async (token) => {
    setLoading(true);
    try {
        const data = await jsonpRequest("token/login", { token });
        setSid(data.eid);
        localStorage.setItem('wialon_sid', data.eid);
        if (data.user && data.user.id && data.user.nm) {
            setUsersMap(prev => ({ ...prev, [data.user.id]: data.user.nm }));
        }
        fetchDevices(data.eid);
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    } catch (err) {
        setError("Login failed.");
    } finally {
        setLoading(false);
    }
  };

  const redirectToWialon = () => {
    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = `${WIALON_LOGIN_URL}?client_id=Geotrax360&access_type=-1&activation_time=0&duration=2592000&flags=1&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  };

  const openInGoogleMaps = (lat, lng) => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    const token = hashParams.get('access_token') || searchParams.get('access_token');
    if (token) handleWialonLogin(token);
    else if (sid) fetchDevices(sid);
  }, []);

  return (
    <div className="devices-module animate-fade">
      {!sid ? (
        <div className="login-card glass">
          <div className="wialon-logo-container">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '3.5rem', height: '3.5rem', color: 'var(--ios-blue)'}}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h2 className="module-title">Tracking Active</h2>
          <p className="module-desc">Geotrax360 platform integration for live fleet management.</p>
          <button className="ios-primary-btn" onClick={redirectToWialon} disabled={loading}>
            {loading ? 'Connecting...' : 'Secure Sign In'}
          </button>
          {error && <p className="error-text" style={{marginTop: '1rem'}}>{error}</p>}
        </div>
      ) : (
        <div className="device-list-container">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem'}}>
            <h2 className="module-title" style={{fontSize: '1.4rem'}}>Fleet Intel</h2>
            <button className="text-btn" onClick={() => { setSid(null); localStorage.removeItem('wialon_sid'); }}>Sign Out</button>
          </div>

          <div className="search-card" style={{marginBottom: '1.25rem'}}>
            <div className="input-group">
                <div className="search-icon-svg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search Vehicle, IMEI, Account or Creator" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="search-input" 
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

          {/* Filter Pills & Toolbar for Scale */}
          {filteredDevices.length > 0 && !loading && (
            <div className="animate-fade">
              {/* Quick Status Filters */}
              <div className="filter-pills-bar">
                <button 
                  className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  <span>All</span>
                  <span className="pill-count">{filteredDevices.length}</span>
                </button>
                <button 
                  className={`filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('active')}
                >
                  <span style={{width: 6, height: 6, borderRadius: '50%', background: '#34c759', display: 'inline-block'}}></span>
                  <span>Active</span>
                  <span className="pill-count">{activeCount}</span>
                </button>
                <button 
                  className={`filter-pill ${statusFilter === 'offline' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('offline')}
                >
                  <span style={{width: 6, height: 6, borderRadius: '50%', background: '#ff3b30', display: 'inline-block'}}></span>
                  <span>Offline</span>
                  <span className="pill-count">{offlineCount}</span>
                </button>
              </div>

              {/* Toolbar with Result Count & Cards/Compact Toggle */}
              <div className="search-toolbar">
                <div className="results-badge">
                  <span className="count-highlight">{statusFilteredDevices.length}</span>
                  <span>{statusFilteredDevices.length === 1 ? 'Tracker' : 'Trackers'}</span>
                  {statusFilteredDevices.length > 10 && (
                    <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>
                      • Showing {displayedDevices.length}
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
            </div>
          )}

          {loading ? (
            <div style={{textAlign: 'center', padding: '3rem'}}>
                <div className="spinner"></div>
                <p style={{marginTop: '1rem', color: 'var(--text-dim)'}}>Retrieving Telemetry...</p>
            </div>
          ) : (
            <div className="results-container">
               {!searchTerm && (
                 <div style={{marginTop: '4rem', textAlign: 'center', opacity: 0.3}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{width: '4rem', height: '4rem', marginBottom: '1rem', color: 'var(--ios-blue)'}}>
                        <path d="M3 11l19-9-9 19-2-8-8-2z"></path>
                    </svg>
                    <p style={{fontSize: '0.95rem', fontWeight: 500}}>Search to track coordinates</p>
                </div>
               )}
               
               {searchTerm.length >= 2 && statusFilteredDevices.length === 0 && !loading && (
                <div className="empty-state glass" style={{padding: '2rem', textAlign: 'center'}}>
                   <p style={{color: 'var(--text-dim)'}}>No tracker found matching criteria.</p>
                </div>
              )}

              {viewMode === 'cards' ? (
                // Full Cards Presentation
                displayedDevices.map((d) => (
                    <div key={d.id} className="result-item animate-fade" style={{padding: '1.5rem'}}>
                      <div className="result-header">
                         <div className="mobile-row">
                            <span className="label-ios">{d.model || d.hwType || 'GPS Asset'}</span>
                            <span className="value-ios" style={{fontSize: '1.3rem'}}>{d.name}</span>
                         </div>
                         <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px'}}>
                              <span className="status-badge" style={{background: d.isOnline ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 59, 48, 0.1)', color: d.isOnline ? '#34c759' : '#ff3b30'}}>
                                  {d.isOnline ? 'Active' : 'Offline'}
                              </span>
                              <span style={{fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-dim)'}}>{d.lastMsg}</span>
                         </div>
                      </div>
                      
                      <div className="details-grid" style={{marginBottom: '1rem', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem'}}>
                        <div className="detail-col">
                            <span className="label-small">Account</span>
                            <span className="value-small" style={{fontSize: '0.85rem'}}>{d.account}</span>
                        </div>
                        <div className="detail-col">
                            <span className="label-small">Creator</span>
                            <span className="value-small" style={{fontSize: '0.85rem'}}>{d.creator}</span>
                        </div>
                        <div className="detail-col">
                            <span className="label-small">IMEI</span>
                            <span className="value-small" style={{fontSize: '0.85rem'}}>{d.imei}</span>
                        </div>
                        <div className="detail-col">
                            <span className="label-small">Phone No.</span>
                            <span className="value-small" style={{fontSize: '0.85rem'}}>{d.phone}</span>
                        </div>
                        {d.vin && (
                          <div className="detail-col">
                              <span className="label-small">VIN Number</span>
                              <span className="value-small" style={{fontSize: '0.85rem'}}>{d.vin}</span>
                          </div>
                        )}
                        <div className="detail-col">
                          <span className="label-small">Speed</span>
                          <span className="value-small" style={{fontSize: '0.85rem', color: d.speed > 0 ? '#ff9500' : 'inherit'}}>{d.speed} km/h</span>
                        </div>
                      </div>

                      <div className="telemetry-tags" style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem'}}>
                          <span style={{fontSize: '0.65rem', background: '#f2f2f7', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, color: '#8e8e93'}}>ALT: {d.alt}m</span>
                          <span style={{fontSize: '0.65rem', background: '#f2f2f7', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, color: '#8e8e93'}}>COURSE: {d.course}°</span>
                          {d.id && <span style={{fontSize: '0.65rem', background: '#f2f2f7', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, color: '#8e8e93'}}>ID: {d.id}</span>}
                      </div>

                      {d.customFields.length > 0 && (
                          <div className="custom-fields-box" style={{background: '#f8f8f8', padding: '10px', borderRadius: '12px', marginBottom: '1rem', border: '1px dashed #e5e5ea'}}>
                              <span className="label-small" style={{fontSize: '0.6rem', marginBottom: '6px', display: 'block'}}>CUSTOM FIELDS</span>
                              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                                  {d.customFields.map((f, i) => (
                                      <div key={i} style={{fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                          <span style={{color: '#8e8e93'}}>{f.label}:</span> <span style={{fontWeight: 600}}>{f.value}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div className="location-bar" style={{padding: '1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 122, 255, 0.04)', border: '1px solid rgba(0, 122, 255, 0.08)'}}>
                          <div style={{display: 'flex', gap: '16px'}}>
                              <div>
                                  <span className="label-small" style={{fontSize: '0.6rem', display: 'block', marginBottom: '2px', color: 'var(--ios-blue)', opacity: 0.7}}>LATITUDE</span>
                                  <span style={{fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f'}}>{d.lat || '--'}</span>
                              </div>
                              <div>
                                  <span className="label-small" style={{fontSize: '0.6rem', display: 'block', marginBottom: '2px', color: 'var(--ios-blue)', opacity: 0.7}}>LONGITUDE</span>
                                  <span style={{fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f'}}>{d.lng || '--'}</span>
                              </div>
                          </div>
                          <button 
                              className="navigate-btn" 
                              onClick={() => openInGoogleMaps(d.lat, d.lng)}
                              disabled={!d.lat}
                          >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '1.1rem', height: '1.1rem'}}>
                                  <path d="M3 11l19-9-9 19-2-8-8-2z"></path>
                              </svg>
                              <span>Go</span>
                          </button>
                      </div>
                    </div>
                ))
              ) : (
                // Compact List View for High Density & Mobile Scale
                displayedDevices.map((d) => {
                  const isExpanded = !!expandedIds[d.id];
                  return (
                    <div key={d.id} className="compact-card animate-fade">
                      <div className="compact-main-row" onClick={() => toggleExpand(d.id)}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1}}>
                          <span style={{width: 8, height: 8, borderRadius: '50%', background: d.isOnline ? '#34c759' : '#ff3b30', flexShrink: 0}}></span>
                          <div className="compact-info">
                            <div className="compact-primary">{d.name}</div>
                            <div className="compact-secondary">
                              <span>{d.model || 'GPS'}</span>
                              <span>•</span>
                              <span>IMEI: {d.imei}</span>
                              {d.speed > 0 && (
                                <>
                                  <span>•</span>
                                  <span style={{color: '#ff9500', fontWeight: 600}}>{d.speed} km/h</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="compact-actions" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="navigate-btn" 
                            style={{padding: '6px 12px', fontSize: '0.75rem', borderRadius: '14px'}}
                            onClick={() => openInGoogleMaps(d.lat, d.lng)}
                            disabled={!d.lat}
                          >
                            <span>Go</span>
                          </button>
                          <button 
                            className={`compact-expand-btn ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleExpand(d.id)}
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
                          <div className="details-grid" style={{paddingTop: '0.5rem', marginBottom: '0.75rem'}}>
                            <div className="detail-col">
                              <span className="label-small">Account</span>
                              <span className="value-small" style={{fontSize: '0.8rem'}}>{d.account}</span>
                            </div>
                            <div className="detail-col">
                              <span className="label-small">Creator</span>
                              <span className="value-small" style={{fontSize: '0.8rem'}}>{d.creator}</span>
                            </div>
                            <div className="detail-col">
                              <span className="label-small">Phone No.</span>
                              <span className="value-small" style={{fontSize: '0.8rem'}}>{d.phone}</span>
                            </div>
                            {d.vin && (
                              <div className="detail-col">
                                <span className="label-small">VIN</span>
                                <span className="value-small" style={{fontSize: '0.8rem'}}>{d.vin}</span>
                              </div>
                            )}
                            <div className="detail-col">
                              <span className="label-small">Last Contact</span>
                              <span className="value-small" style={{fontSize: '0.8rem'}}>{d.lastMsg}</span>
                            </div>
                            <div className="detail-col">
                              <span className="label-small">Coordinates</span>
                              <span className="value-small" style={{fontSize: '0.8rem'}}>
                                {d.lat ? `${d.lat}, ${d.lng}` : 'No GPS'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Scalable Pagination / Progressive Loading */}
              {statusFilteredDevices.length > 10 && (
                <div className="pagination-wrapper">
                  {hasMore ? (
                    <button 
                      className="load-more-btn"
                      onClick={() => setVisibleCount(prev => Math.min(prev + 10, statusFilteredDevices.length))}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '16px', height: '16px'}}>
                        <polyline points="7 13 12 18 17 13"></polyline>
                        <polyline points="7 6 12 11 17 6"></polyline>
                      </svg>
                      <span>Load 10 More ({remainingCount} remaining)</span>
                    </button>
                  ) : (
                    <div className="pagination-summary" style={{ textAlign: 'center', padding: '0.5rem' }}>
                      All {statusFilteredDevices.length} trackers loaded
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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

export default Devices;
