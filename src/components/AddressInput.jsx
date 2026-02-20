import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { searchAddress } from '../utils/geocoding';

// SVG icons used in the dropdown (no emoji — matches Uber style)
const IconLocation = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
      fill="#888"/>
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 11H11V7h1.5v5.25l4.5 2.67-.75 1.23L12.5 13z"
      fill="#888"/>
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      fill="#888"/>
  </svg>
);

// Quick suggestions shown before the user types anything
const QUICK_SUGGESTIONS = [
  { id: '__home__', label: 'Home', sub: 'Set your home address', icon: 'home' },
  { id: '__work__', label: 'Work', sub: 'Set your work address', icon: 'work' },
];

const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="#555"/>
  </svg>
);

const IconWork = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M20 6h-2.18c.07-.44.18-.86.18-1a3 3 0 0 0-6 0c0 .14.11.56.18 1H10c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h10c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6-2a1 1 0 0 1 1 1c0 .14-.11.56-.18 1h-1.64C13.11 5.56 13 5.14 13 5a1 1 0 0 1 1-1zm2 14h-4v-1h4v1zm2-4H10v-1h8v1zm0-4H10V9h8v1z"
      fill="#555"/>
  </svg>
);

function getDebounceMs(q) {
  return /^\d/.test(q.trim()) ? 700 : 300;
}

export default function AddressInput({ label, placeholder, value, onSelect, color }) {
  const [query, setQuery] = useState(value?.shortName || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 300 });
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    if (value?.shortName && !focused) {
      setQuery(value.shortName);
    }
  }, [value, focused]);

  const updateDropdownPos = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const doSearch = useCallback((q) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const data = await searchAddress(trimmed, 8);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, getDebounceMs(q));
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    doSearch(q);
  };

  const handleSelect = (item) => {
    setQuery(item.shortName);
    setResults([]);
    setFocused(false);
    onSelect(item);
    inputRef.current?.blur();
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleSelect(results[0]);
        return;
      }
      const q = query.trim();
      if (q.length < 1) return;
      setLoading(true);
      try {
        const data = await searchAddress(q, 1);
        if (data.length > 0) handleSelect(data[0]);
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    } else if (e.key === 'ArrowDown') {
      dropdownRef.current?.querySelector('button')?.focus();
    } else if (e.key === 'Escape') {
      setFocused(false);
      setResults([]);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setFocused(true);
    // Use rAF so layout is fully updated before measuring
    requestAnimationFrame(updateDropdownPos);
    if (query.trim().length >= 1) doSearch(query);
  };

  const handleBlur = (e) => {
    if (dropdownRef.current?.contains(e.relatedTarget)) return;
    setTimeout(() => {
      setFocused(false);
      setResults([]);
    }, 200);
  };

  // Keep position in sync on scroll/resize
  useEffect(() => {
    if (!focused) return;
    updateDropdownPos();
    window.addEventListener('scroll', updateDropdownPos, true);
    window.addEventListener('resize', updateDropdownPos);
    return () => {
      window.removeEventListener('scroll', updateDropdownPos, true);
      window.removeEventListener('resize', updateDropdownPos);
    };
  }, [focused, updateDropdownPos]);

  const hasQuery = query.trim().length >= 1;
  const showDropdown = focused;
  const showQuick = !hasQuery && !loading;
  const showResults = hasQuery && results.length > 0;
  const showNoResults = hasQuery && !loading && results.length === 0;

  const dropdown = showDropdown
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: Math.max(dropdownPos.width, 280),
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            zIndex: 99999,
            overflow: 'hidden',
          }}
        >
          {/* Searching spinner */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', color: '#888', fontSize: 14 }}>
              <div style={{
                width: 16, height: 16,
                border: '2px solid #e0e0e0',
                borderTopColor: '#555',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                flexShrink: 0,
              }}/>
              Searching…
            </div>
          )}

          {/* Quick picks (no query yet) */}
          {showQuick && QUICK_SUGGESTIONS.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: i < QUICK_SUGGESTIONS.length - 1 ? '1px solid #f0f0f0' : 'none',
                cursor: 'default',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#f5f5f5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {item.icon === 'home' ? <IconHome /> : <IconWork />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{item.label}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>{item.sub}</div>
              </div>
            </div>
          ))}

          {/* Address results */}
          {showResults && results.map((item, i) => (
            <button
              key={item.id}
              tabIndex={0}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                width: '100%',
                background: 'none',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid #f2f2f2' : 'none',
                padding: '12px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f7')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#f0f0f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                marginTop: 1,
              }}>
                <IconLocation />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, fontSize: 14, color: '#1a1a1a',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {item.shortName.split(',')[0].trim()}
                </div>
                <div style={{
                  fontSize: 12, color: '#777', marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {item.shortName.includes(',')
                    ? item.shortName.split(',').slice(1).join(',').trim()
                    : item.displayName.split(',').slice(1, 3).join(',').trim()}
                </div>
              </div>
            </button>
          ))}

          {/* No results */}
          {showNoResults && (
            <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, color: '#888', fontSize: 13 }}>
              <IconSearch />
              <span>No results — press <strong>Enter</strong> to search</span>
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#f5f5f5',
          borderRadius: 12,
          padding: '12px 14px',
          border: focused ? `2px solid ${color}` : '2px solid transparent',
          transition: 'border-color 0.18s',
        }}
      >
        <div style={{
          width: 10, height: 10,
          borderRadius: color === '#000' ? '2px' : '50%',
          background: color,
          flexShrink: 0,
        }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            fontSize: 15,
            fontFamily: 'inherit',
            fontWeight: 500,
            color: '#1a1a1a',
            outline: 'none',
          }}
        />
        {loading && (
          <div style={{
            width: 16, height: 16,
            border: '2px solid #ddd',
            borderTopColor: '#1a1a1a',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }} />
        )}
        {!loading && query.length > 0 && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery('');
              setResults([]);
              onSelect(null);
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#999', fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>
      {dropdown}
    </div>
  );
}
