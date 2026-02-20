import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Uber-style dark top-down sedan (front points up)
const CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 62" width="38" height="62">
  <defs>
    <filter id="carShadow" x="-50%" y="-30%" width="200%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1c1c1c"/>
      <stop offset="45%" stop-color="#2e2e2e"/>
      <stop offset="100%" stop-color="#1c1c1c"/>
    </linearGradient>
  </defs>
  <g filter="url(#carShadow)">
    <!-- Main body -->
    <rect x="4" y="9" width="30" height="44" rx="9" fill="url(#bodyGrad)"/>
    <!-- Front bumper -->
    <rect x="9" y="5" width="20" height="7" rx="4" fill="#222"/>
    <!-- Rear bumper -->
    <rect x="9" y="50" width="20" height="7" rx="4" fill="#1a1a1a"/>
    <!-- Front windshield -->
    <rect x="8" y="12" width="22" height="13" rx="4" fill="#5ba3c9" opacity="0.55"/>
    <!-- Roof panel -->
    <rect x="9" y="25" width="20" height="12" rx="3" fill="#242424"/>
    <!-- Rear windshield -->
    <rect x="8" y="37" width="22" height="11" rx="4" fill="#5ba3c9" opacity="0.38"/>
    <!-- Front headlights -->
    <rect x="9" y="6" width="7" height="3.5" rx="1.75" fill="#fffde4"/>
    <rect x="22" y="6" width="7" height="3.5" rx="1.75" fill="#fffde4"/>
    <!-- Headlight glow -->
    <rect x="10" y="6.5" width="5" height="2" rx="1" fill="#fff8c0" opacity="0.8"/>
    <rect x="23" y="6.5" width="5" height="2" rx="1" fill="#fff8c0" opacity="0.8"/>
    <!-- Tail lights -->
    <rect x="9" y="52" width="7" height="3" rx="1.5" fill="#cc0000"/>
    <rect x="22" y="52" width="7" height="3" rx="1.5" fill="#cc0000"/>
    <!-- Front wheels -->
    <rect x="0" y="12" width="6" height="11" rx="3" fill="#111"/>
    <rect x="32" y="12" width="6" height="11" rx="3" fill="#111"/>
    <!-- Rear wheels -->
    <rect x="0" y="39" width="6" height="11" rx="3" fill="#111"/>
    <rect x="32" y="39" width="6" height="11" rx="3" fill="#111"/>
    <!-- Wheel hub rims -->
    <rect x="1" y="14" width="4" height="7" rx="2" fill="#2d2d2d"/>
    <rect x="33" y="14" width="4" height="7" rx="2" fill="#2d2d2d"/>
    <rect x="1" y="41" width="4" height="7" rx="2" fill="#2d2d2d"/>
    <rect x="33" y="41" width="4" height="7" rx="2" fill="#2d2d2d"/>
    <!-- Center console highlight -->
    <rect x="17.5" y="27" width="3" height="8" rx="1.5" fill="#333"/>
  </g>
</svg>`;

const PICKUP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
  <defs>
    <filter id="ps" x="-30%" y="-20%" width="160%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <g filter="url(#ps)">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24S32 28 32 16C32 7.16 24.84 0 16 0z" fill="#000"/>
    <circle cx="16" cy="16" r="8" fill="#fff"/>
    <circle cx="16" cy="16" r="4" fill="#000"/>
  </g>
</svg>`;

const DEST_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
  <defs>
    <filter id="ds" x="-30%" y="-20%" width="160%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <g filter="url(#ds)">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24S32 28 32 16C32 7.16 24.84 0 16 0z" fill="#276EF1"/>
    <circle cx="16" cy="16" r="8" fill="#fff"/>
    <circle cx="16" cy="16" r="4" fill="#276EF1"/>
  </g>
</svg>`;

// Create car marker icon ONCE — the inner wrapper's CSS rotation is updated in-place,
// so we never need to recreate the icon (which would cause DOM flicker).
function createCarIcon() {
  return L.divIcon({
    html: `<div class="car-rotate-wrapper" style="width:38px;height:62px;transform-origin:center;will-change:transform;">${CAR_SVG}</div>`,
    iconSize: [38, 62],
    iconAnchor: [19, 31],
    className: 'car-icon-container',
  });
}

function createMarkerIcon(svg, anchor = [16, 40]) {
  return L.divIcon({
    html: svg,
    iconSize: [32, 40],
    iconAnchor: anchor,
    className: '',
  });
}

function calcHeading(from, to) {
  const dLon = to[1] - from[1];
  const dLat = to[0] - from[0];
  const angle = (Math.atan2(dLon, dLat) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function interpolate(coords, t) {
  if (t <= 0) return coords[0];
  if (t >= 1) return coords[coords.length - 1];
  const totalSeg = coords.length - 1;
  const idx = Math.min(Math.floor(t * totalSeg), totalSeg - 1);
  const segT = t * totalSeg - idx;
  const a = coords[idx];
  const b = coords[idx + 1];
  return [a[0] + (b[0] - a[0]) * segT, a[1] + (b[1] - a[1]) * segT];
}

export default function MapView({ pickup, destination, route, isAnimating, onAnimationEnd, onMapClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const carMarkerRef = useRef(null);
  // Direct ref to the inner rotation wrapper — updated via CSS, never via setIcon()
  const carIconElRef = useRef(null);
  const routeLayerRef = useRef(null);
  const traveledLayerRef = useRef(null);
  const animFrameRef = useRef(null);
  const animStartRef = useRef(null);
  // For smooth heading interpolation across frames
  const currentHeadingRef = useRef(0);

  // Init map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [40.7128, -74.006],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: '' })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>')
      .addTo(map);

    map.on('click', (e) => {
      if (onMapClick) onMapClick(e.latlng);
    });

    mapInstanceRef.current = map;
  }, []);

  // Update map click handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.off('click');
    map.on('click', (e) => {
      if (onMapClick) onMapClick(e.latlng);
    });
  }, [onMapClick]);

  // Pickup marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickupMarkerRef.current) {
      map.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }

    if (pickup) {
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lon], {
        icon: createMarkerIcon(PICKUP_SVG),
        zIndexOffset: 100,
      }).addTo(map);
    }
  }, [pickup]);

  // Destination marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    if (destination) {
      destMarkerRef.current = L.marker([destination.lat, destination.lon], {
        icon: createMarkerIcon(DEST_SVG),
        zIndexOffset: 200,
      }).addTo(map);
    }
  }, [destination]);

  // Route polyline + car initial placement
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
    if (traveledLayerRef.current) { map.removeLayer(traveledLayerRef.current); traveledLayerRef.current = null; }
    if (carMarkerRef.current) { map.removeLayer(carMarkerRef.current); carMarkerRef.current = null; }
    carIconElRef.current = null;

    if (route) {
      // Faded route (remaining)
      routeLayerRef.current = L.polyline(route.coordinates, {
        color: '#276EF1',
        weight: 5,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Traveled route (updated during animation)
      traveledLayerRef.current = L.polyline([], {
        color: '#276EF1',
        weight: 5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Car at pickup, pointing toward next waypoint
      const startCoord = route.coordinates[0];
      const nextCoord = route.coordinates[1] || startCoord;
      const initialHeading = calcHeading(startCoord, nextCoord);
      currentHeadingRef.current = initialHeading;

      carMarkerRef.current = L.marker(startCoord, {
        icon: createCarIcon(),
        zIndexOffset: 1000,
      }).addTo(map);

      // Grab the rotation wrapper DOM element (available after addTo)
      requestAnimationFrame(() => {
        const el = carMarkerRef.current?.getElement();
        if (el) {
          carIconElRef.current = el.querySelector('.car-rotate-wrapper');
          if (carIconElRef.current) {
            carIconElRef.current.style.transform = `rotate(${initialHeading}deg)`;
          }
        }
      });

      const bounds = L.latLngBounds(route.coordinates);
      map.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1 });
    }
  }, [route]);

  // Smooth animation — position via setLatLng, rotation via direct CSS transform (no setIcon)
  useEffect(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (!isAnimating || !route) return;

    const coords = route.coordinates;
    // Duration: 25–45 s for typical routes
    const duration = Math.min(Math.max(route.duration * 1000 * 0.25, 25000), 45000);
    animStartRef.current = null;

    const animate = (timestamp) => {
      if (!animStartRef.current) animStartRef.current = timestamp;
      const elapsed = timestamp - animStartRef.current;
      const rawT = Math.min(elapsed / duration, 1);

      const pos = interpolate(coords, rawT);

      // Look a little ahead for a stable heading (avoids micro-jitter from dense waypoints)
      const lookT = Math.min(rawT + 0.015, 1);
      const lookPos = interpolate(coords, lookT);
      const targetHeading = calcHeading(pos, lookPos);

      // Smooth heading: find shortest arc, then lerp 12% per frame (~60 fps → reaches target in ~5 frames)
      let diff = targetHeading - currentHeadingRef.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      currentHeadingRef.current = ((currentHeadingRef.current + diff * 0.12) + 360) % 360;

      // Move car position (Leaflet handles this smoothly via CSS translate)
      if (carMarkerRef.current) {
        carMarkerRef.current.setLatLng(pos);
      }

      // Rotate car icon via direct DOM style — zero DOM mutations, GPU-accelerated
      if (!carIconElRef.current && carMarkerRef.current) {
        const el = carMarkerRef.current.getElement();
        if (el) carIconElRef.current = el.querySelector('.car-rotate-wrapper');
      }
      if (carIconElRef.current) {
        carIconElRef.current.style.transform = `rotate(${currentHeadingRef.current}deg)`;
      }

      // Update traveled polyline
      const traveledCount = Math.floor(rawT * (coords.length - 1));
      const traveledCoords = [...coords.slice(0, traveledCount + 1), pos];
      if (traveledLayerRef.current) {
        traveledLayerRef.current.setLatLngs(traveledCoords);
      }

      // Pan camera to follow car
      if (mapInstanceRef.current && rawT > 0.03) {
        mapInstanceRef.current.panTo(pos, { animate: true, duration: 0.5, noMoveStart: true });
      }

      if (rawT < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        animFrameRef.current = null;
        if (onAnimationEnd) onAnimationEnd();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isAnimating, route]);

  // Fit to both markers if no route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || route) return;

    if (pickup && destination) {
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lon],
        [destination.lat, destination.lon],
      ]);
      map.fitBounds(bounds, { padding: [100, 100], animate: true, duration: 1 });
    } else if (pickup) {
      map.flyTo([pickup.lat, pickup.lon], 15, { animate: true, duration: 1 });
    } else if (destination) {
      map.flyTo([destination.lat, destination.lon], 15, { animate: true, duration: 1 });
    }
  }, [pickup, destination, route]);

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 0 }}
    />
  );
}
