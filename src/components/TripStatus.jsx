export default function TripStatus({ rideType, isAnimating, onDone }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Driver card */}
      <div
        style={{
          background: '#f5f5f5',
          borderRadius: 16,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 50,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            flexShrink: 0,
          }}
        >
          👨‍✈️
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>Marcus Rivera</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            ⭐ 4.95 · {rideType?.name || 'UberX'}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            🚗 Toyota Camry · <strong style={{ color: '#1a1a1a' }}>ABC 1234</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              width: 40,
              height: 40,
              borderRadius: 50,
              border: 'none',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 18,
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}
          >
            💬
          </button>
          <button
            style={{
              width: 40,
              height: 40,
              borderRadius: 50,
              border: 'none',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 18,
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}
          >
            📞
          </button>
        </div>
      </div>

      {/* Status */}
      <div style={{ textAlign: 'center' }}>
        {isAnimating ? (
          <>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#f0fdf4',
                border: '1.5px solid #22c55e',
                borderRadius: 20,
                padding: '8px 16px',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>🚗</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#16a34a' }}>
                On the way...
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#888' }}>Your driver is heading to destination</p>
          </>
        ) : (
          <>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#f0fdf4',
                border: '1.5px solid #22c55e',
                borderRadius: 20,
                padding: '8px 16px',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#16a34a' }}>
                Arrived!
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#888' }}>You have reached your destination</p>
          </>
        )}
      </div>

      {/* Cancel / Done button */}
      <button
        onClick={onDone}
        style={{
          background: isAnimating ? '#fff' : '#000',
          color: isAnimating ? '#1a1a1a' : '#fff',
          border: isAnimating ? '2px solid #e0e0e0' : 'none',
          borderRadius: 14,
          padding: '14px',
          fontSize: 15,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {isAnimating ? 'Cancel Trip' : 'Book Another Ride'}
      </button>
    </div>
  );
}
