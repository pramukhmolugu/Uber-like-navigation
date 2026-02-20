import { useState, useEffect, useRef, useCallback } from 'react';
import { searchAddress } from '../utils/geocoding';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const PLACE_ICONS = {
  amenity: '🏪',
  building: '🏢',
  highway: '🛣️',
  place: '📍',
  natural: '🌿',
  default: '📍',
};

function getIcon(category) {
  return PLACE_ICONS[category] || PLACE_ICONS.default;
}

export default function AddressInput({ label, placeholder, value, onSelect, color, icon }) {
  const [query, setQuery] = useState(value?.shortName || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value?.shortName && !focused) {
      setQuery(value.shortName);
    }
  }, [value, focused]);

  const doSearch = useCallback(
    debounce(async (q) => {
      if (q.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      try {
        const data = await searchAddress(q, 6);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350),
    []
  );

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

  const handleFocus = () => {
    setFocused(true);
    if (query.trim().length >= 2) doSearch(query);
  };

  const handleBlur = (e) => {
    if (dropdownRef.current?.contains(e.relatedTarget)) return;
    setTimeout(() => {
      setFocused(false);
      setResults([]);
    }, 150);
  };

  const showDropdown = focused && (loading || results.length > 0 || query.trim().length >= 2);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
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
            onMouseDown={(e) => { e.preventDefault(); setQuery(''); setResults([]); onSelect(null); }}
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

      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            zIndex: 2000,
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
            <div style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: 14 }}>
              No results found
            </div>
          )}
          {results.map((item, i) => (
            <button
              key={item.id}
              onMouseDown={() => handleSelect(item)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                width: '100%',
                background: 'none',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid #f0f0f0' : 'none',
                padding: '13px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9f9')}
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
                  fontSize: 18,
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
                  {item.shortName.split(',')[0]}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#888',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.displayName.split(',').slice(1, 4).join(',').trim()}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
