import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { searchAddress } from '../utils/geocoding';

// Shorter debounce for address-like queries (start with digit or end with 2-letter word)
function getDebounceMs(q) {
  return /^\d/.test(q.trim()) || /\b[A-Za-z]{2}$/.test(q.trim()) ? 600 : 350;
}


const PLACE_ICONS = {
  amenity: '🏪',
  building: '🏢',
  highway: '🛣️',
  place: '📍',
  natural: '🌿',
  tourism: '🏛️',
  leisure: '🌳',
  shop: '🛍️',
  default: '📍',
};

function getIcon(category) {
  return PLACE_ICONS[category] || PLACE_ICONS.default;
}

export default function AddressInput({ label, placeholder, value, onSelect, color }) {
  const [query, setQuery] = useState(value?.shortName || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value?.shortName && !focused) {
      setQuery(value.shortName);
    }
  }, [value, focused]);

  // Recreate debounced fn whenever query changes (so delay adapts)
  const doSearchRef = useRef(null);
  const doSearch = useCallback((q) => {
    if (doSearchRef.current) doSearchRef.current.cancel?.();
    const delay = getDebounceMs(q);
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (q.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      try {
        const data = await searchAddress(q, 8);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);
    doSearchRef.current = { cancel: () => { cancelled = true; clearTimeout(timer); } };
  }, []);

  const updateDropdownPos = useCallback(() => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (q.trim().length >= 2) setLoading(true);
    else setLoading(false);
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
      // If we have results, select the first one
      if (results.length > 0) {
        handleSelect(results[0]);
        return;
      }
      // Otherwise geocode the raw text right now
      const q = query.trim();
      if (q.length < 2) return;
      setLoading(true);
      try {
        const data = await searchAddress(q, 1);
        if (data.length > 0) {
          handleSelect(data[0]);
        }
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    } else if (e.key === 'ArrowDown') {
      // Move focus into the dropdown
      dropdownRef.current?.querySelector('button')?.focus();
    }
  };

  const handleFocus = () => {
    setFocused(true);
    updateDropdownPos();
    if (query.trim().length >= 2) doSearch(query);
  };

  const handleBlur = (e) => {
    if (dropdownRef.current?.contains(e.relatedTarget)) return;
    setTimeout(() => {
      setFocused(false);
      setResults([]);
    }, 200);
  };

  // Keep dropdown position in sync on scroll / resize
  useEffect(() => {
    if (!focused) return;
    const onScroll = () => updateDropdownPos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [focused, updateDropdownPos]);

  const showDropdown = focused && (loading || results.length > 0 || query.trim().length >= 2);

  const dropdown = showDropdown
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            zIndex: 99999,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {loading && results.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: 14 }}>
              Searching...
            </div>
          )}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div style={{ padding: '14px 16px', color: '#666', fontSize: 13 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No suggestions yet</div>
              <div style={{ color: '#999' }}>
                Press <kbd style={{ background: '#f0f0f0', borderRadius: 4, padding: '1px 6px', fontSize: 12, border: '1px solid #ddd' }}>Enter</kbd> to search for this address
              </div>
            </div>
          )}
          {results.map((item, i) => (
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
                borderBottom: i < results.length - 1 ? '1px solid #f0f0f0' : 'none',
                padding: '12px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {getIcon(item.category)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#1a1a1a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {/* Show house number + street, or place name — never cut off at first comma */}
                  {item.shortName.split(',')[0].trim()}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#555',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {/* Use the city/state tail of shortName — clean and always correct */}
                  {item.shortName.includes(',')
                    ? item.shortName.split(',').slice(1).join(',').trim()
                    : item.displayName.split(',').slice(1, 3).join(',').trim()}
                </div>
              </div>
            </button>
          ))}
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
          transition: 'border-color 0.2s',
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: color === '#000' ? '2px' : '50%',
            background: color,
            flexShrink: 0,
          }}
        />
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
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid #ddd',
              borderTopColor: '#1a1a1a',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              flexShrink: 0,
            }}
          />
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
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
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
