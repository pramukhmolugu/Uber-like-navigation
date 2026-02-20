import { useState, useCallback, useEffect } from 'react';
import MapView from './components/MapView';
import AddressInput from './components/AddressInput';
import RidePanel from './components/RidePanel';
import TripStatus from './components/TripStatus';
import { getRoute } from './utils/routing';
import { reverseGeocode } from './utils/geocoding';
import './App.css';

const STAGES = {
  SEARCH: 'search',
  CHOOSE_RIDE: 'choose_ride',
  IN_TRIP: 'in_trip',
};

export default function App() {
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [stage, setStage] = useState(STAGES.SEARCH);
  const [selectedRide, setSelectedRide] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [panelVisible, setPanelVisible] = useState(true);
  const [clickMode, setClickMode] = useState(null); // 'pickup' | 'destination' | null

  // Try to get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            setPickup(loc);
          } catch {
            // ignore
          }
        },
        () => {
          // Default to NYC if permission denied
          setPickup({
            lat: 40.7128,
            lon: -74.006,
            shortName: 'New York, NY',
            displayName: 'New York, New York, United States',
          });
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Fetch route when both pickup and destination are set
  useEffect(() => {
    if (!pickup || !destination) {
      setRoute(null);
      return;
    }

    let cancelled = false;
    setRouteLoading(true);
    setRouteError(null);

    getRoute(
      { lat: pickup.lat, lon: pickup.lon },
      { lat: destination.lat, lon: destination.lon }
    )
      .then((r) => {
        if (!cancelled) {
          setRoute(r);
          setRouteLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRouteError('Could not calculate route. Please try again.');
          setRouteLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [pickup, destination]);

  const handleMapClick = useCallback(
    async (latlng) => {
      if (clickMode === 'pickup') {
        try {
          const loc = await reverseGeocode(latlng.lat, latlng.lng);
          setPickup(loc);
        } catch {
          setPickup({ lat: latlng.lat, lon: latlng.lng, shortName: 'Selected Location', displayName: 'Selected Location' });
        }
        setClickMode(null);
      } else if (clickMode === 'destination') {
        try {
          const loc = await reverseGeocode(latlng.lat, latlng.lng);
          setDestination(loc);
        } catch {
          setDestination({ lat: latlng.lat, lon: latlng.lng, shortName: 'Selected Location', displayName: 'Selected Location' });
        }
        setClickMode(null);
      }
    },
    [clickMode]
  );

  const handleBookRide = (rideType) => {
    setSelectedRide(rideType);
    setStage(STAGES.IN_TRIP);
    setIsAnimating(true);
  };

  const handleAnimationEnd = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const handleReset = () => {
    setStage(STAGES.SEARCH);
    setRoute(null);
    setDestination(null);
    setIsAnimating(false);
    setSelectedRide(null);
  };

  const canRequestRide = pickup && destination && route && !routeLoading;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* MAP */}
      <MapView
        pickup={pickup}
        destination={destination}
        route={route}
        isAnimating={isAnimating}
        onAnimationEnd={handleAnimationEnd}
        onMapClick={handleMapClick}
      />

      {/* Click mode overlay */}
      {clickMode && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 500,
            cursor: 'crosshair',
            background: 'transparent',
          }}
        />
      )}

      {/* Click mode banner */}
      {clickMode && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#000',
            color: '#fff',
            borderRadius: 24,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            zIndex: 600,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>Click on map to set {clickMode === 'pickup' ? 'pickup' : 'destination'}</span>
          <button
            onClick={() => setClickMode(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* PANEL toggle button (mobile) */}
      {!panelVisible && (
        <button
          onClick={() => setPanelVisible(true)}
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: 28,
            padding: '14px 28px',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
            zIndex: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          Show Panel ↑
        </button>
      )}

      {/* MAIN PANEL */}
      {panelVisible && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 380,
            background: '#fff',
            zIndex: 400,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
            animation: 'slideIn 0.3s ease',
          }}
        >
          {/* Logo bar */}
          <div
            style={{
              padding: '20px 24px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="#000"/>
                <path d="M7 14C7 10.13 10.13 7 14 7V21C10.13 21 7 17.87 7 14Z" fill="#fff"/>
                <path d="M14 7C17.87 7 21 10.13 21 14C21 17.87 17.87 21 14 21" fill="#fff" opacity="0.4"/>
              </svg>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', letterSpacing: '-0.5px' }}>
                uber
              </span>
            </div>
            <button
              onClick={() => setPanelVisible(false)}
              style={{
                background: '#f5f5f5',
                border: 'none',
                borderRadius: 50,
                width: 32,
                height: 32,
                cursor: 'pointer',
                fontSize: 16,
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ←
            </button>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>
            {stage === STAGES.SEARCH && (
              <SearchStage
                pickup={pickup}
                destination={destination}
                route={route}
                routeLoading={routeLoading}
                routeError={routeError}
                canRequestRide={canRequestRide}
                clickMode={clickMode}
                onPickupSelect={setPickup}
                onDestinationSelect={setDestination}
                onSetClickMode={setClickMode}
                onRequestRide={() => setStage(STAGES.CHOOSE_RIDE)}
              />
            )}

            {stage === STAGES.CHOOSE_RIDE && route && (
              <RidePanel
                route={route}
                onBook={handleBookRide}
                onClose={() => setStage(STAGES.SEARCH)}
              />
            )}

            {stage === STAGES.IN_TRIP && (
              <TripStatus
                rideType={selectedRide}
                isAnimating={isAnimating}
                onDone={handleReset}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchStage({
  pickup, destination, route, routeLoading, routeError, canRequestRide,
  clickMode, onPickupSelect, onDestinationSelect, onSetClickMode, onRequestRide,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a', marginBottom: 20, letterSpacing: '-0.5px' }}>
        Where to?
      </h1>

      {/* Inputs */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
          padding: 4,
          marginBottom: 12,
        }}
      >
        {/* Pickup */}
        <div style={{ padding: '4px 4px 2px' }}>
          <AddressInput
            label="Pickup"
            placeholder="Pickup location"
            value={pickup}
            onSelect={onPickupSelect}
            color="#000"
          />
        </div>

        {/* Divider with swap */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            gap: 8,
          }}
        >
          <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          <button
            onClick={() => {
              // swap pickup and destination
              const tmp = pickup;
              onPickupSelect(destination);
              onDestinationSelect(tmp);
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 50,
              border: '1.5px solid #e0e0e0',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              flexShrink: 0,
            }}
            title="Swap pickup and destination"
          >
            ⇅
          </button>
          <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
        </div>

        {/* Destination */}
        <div style={{ padding: '2px 4px 4px' }}>
          <AddressInput
            label="Destination"
            placeholder="Where to?"
            value={destination}
            onSelect={onDestinationSelect}
            color="#276EF1"
          />
        </div>
      </div>

      {/* Map pin buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => onSetClickMode(clickMode === 'pickup' ? null : 'pickup')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 12,
            border: '1.5px solid',
            borderColor: clickMode === 'pickup' ? '#000' : '#e0e0e0',
            background: clickMode === 'pickup' ? '#000' : '#fff',
            color: clickMode === 'pickup' ? '#fff' : '#555',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          📍 Pin Pickup
        </button>
        <button
          onClick={() => onSetClickMode(clickMode === 'destination' ? null : 'destination')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 12,
            border: '1.5px solid',
            borderColor: clickMode === 'destination' ? '#276EF1' : '#e0e0e0',
            background: clickMode === 'destination' ? '#276EF1' : '#fff',
            color: clickMode === 'destination' ? '#fff' : '#555',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          🏁 Pin Dest
        </button>
      </div>

      {/* Route info */}
      {routeLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#f5f5f5',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 14,
            fontSize: 14,
            color: '#666',
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              border: '2px solid #ddd',
              borderTopColor: '#333',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              flexShrink: 0,
            }}
          />
          Calculating route...
        </div>
      )}

      {routeError && (
        <div
          style={{
            background: '#fff5f5',
            border: '1.5px solid #fed7d7',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 14,
            color: '#c53030',
            marginBottom: 14,
          }}
        >
          {routeError}
        </div>
      )}

      {route && !routeLoading && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 14,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Route found</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>
              {route.durationText} · {route.distanceText}
            </div>
          </div>
          <span style={{ fontSize: 24 }}>🗺️</span>
        </div>
      )}

      {/* Quick destinations */}
      {!destination && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 10 }}>
            SAVED PLACES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { icon: '🏠', label: 'Home', sub: 'Add home' },
              { icon: '💼', label: 'Work', sub: 'Add work' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 4px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request button */}
      {canRequestRide && (
        <button
          onClick={onRequestRide}
          style={{
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
            width: '100%',
            marginTop: 8,
            animation: 'fadeIn 0.2s ease',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          See ride options →
        </button>
      )}
    </div>
  );
}
