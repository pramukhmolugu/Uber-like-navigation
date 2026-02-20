import { useState } from 'react';

const RIDE_TYPES = [
  {
    id: 'uberx',
    name: 'UberX',
    desc: 'Affordable, everyday rides',
    icon: '🚗',
    multiplier: 1.0,
    capacity: 4,
  },
  {
    id: 'comfort',
    name: 'Comfort',
    desc: 'Newer cars with extra legroom',
    icon: '🚙',
    multiplier: 1.4,
    capacity: 4,
  },
  {
    id: 'uberxl',
    name: 'UberXL',
    desc: 'Affordable rides for groups up to 6',
    icon: '🚐',
    multiplier: 1.8,
    capacity: 6,
  },
  {
    id: 'black',
    name: 'Uber Black',
    desc: 'Premium rides in luxury cars',
    icon: '🖤',
    multiplier: 2.5,
    capacity: 4,
  },
];

function estimatePrice(distance, duration, multiplier) {
  const base = 2.5;
  const perKm = 1.2;
  const perMin = 0.22;
  const km = distance / 1000;
  const mins = duration / 60;
  const price = (base + perKm * km + perMin * mins) * multiplier;
  return price.toFixed(2);
}

export default function RidePanel({ route, onBook, onClose }) {
  const [selected, setSelected] = useState('uberx');

  const selectedType = RIDE_TYPES.find((r) => r.id === selected);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>Choose a ride</h2>
        <button
          onClick={onClose}
          style={{
            background: '#f5f5f5',
            border: 'none',
            borderRadius: 50,
            width: 32,
            height: 32,
            cursor: 'pointer',
            fontSize: 18,
            color: '#555',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Trip info */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          background: '#f5f5f5',
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 14,
        }}
      >
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Distance</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
            {route.distanceText}
          </div>
        </div>
        <div style={{ width: 1, background: '#ddd' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Duration</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
            {route.durationText}
          </div>
        </div>
      </div>

      {/* Ride options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {RIDE_TYPES.map((type) => {
          const price = estimatePrice(route.distance, route.duration, type.multiplier);
          const isSelected = selected === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setSelected(type.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: isSelected ? '#000' : '#f5f5f5',
                border: '2px solid transparent',
                borderRadius: 14,
                padding: '12px 14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 28 }}>{type.icon}</div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: isSelected ? '#fff' : '#1a1a1a',
                  }}
                >
                  {type.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: isSelected ? 'rgba(255,255,255,0.65)' : '#888',
                    marginTop: 2,
                  }}
                >
                  {type.desc} · {type.capacity} seats
                </div>
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: isSelected ? '#fff' : '#1a1a1a',
                }}
              >
                ${price}
              </div>
            </button>
          );
        })}
      </div>

      {/* Book button */}
      <button
        onClick={() => onBook(selectedType)}
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
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Request {selectedType.name}
      </button>
    </div>
  );
}
