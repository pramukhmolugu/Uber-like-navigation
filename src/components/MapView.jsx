import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// SVG icons
const CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.35)"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <rect x="8" y="20" width="48" height="26" rx="6" fill="#1a1a1a"/>
    <rect x="14" y="14" width="36" height="18" rx="5" fill="#333"/>
    <rect x="16" y="16" width="14" height="12" rx="3" fill="#87CEEB" opacity="0.8"/>
    <rect x="34" y="16" width="14" height="12" rx="3" fill="#87CEEB" opacity="0.8"/>
    <circle cx="18" cy="46" r="7" fill="#222"/>
    <circle cx="18" cy="46" r="4" fill="#555"/>
    <circle cx="46" cy="46" r="7" fill="#222"/>
    <circle cx="46" cy="46" r="4" fill="#555"/>
    <rect x="8" y="28" width="4" height="6" rx="2" fill="#FFD700"/>
    <rect x="52" y="28" width="4" height="6" rx="2" fill="#FF4444"/>
    <rect x="8" y="36" width="48" height="3" rx="1" fill="#444"/>
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

function createCarIcon(heading = 0) {
  return L.divIcon({
    html: `<div style="transform:rotate(${heading}deg);transform-origin:center;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">${CAR_SVG}</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    className: '',
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

function ease(t) {
  // cubic ease-in-out
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function MapView({ pickup, destination, route, isAnimating, onAnimationEnd, onMapClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const carMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const traveledLayerRef = useRef(null);
  const animFrameRef = useRef(null);
  const animStartRef = useRef(null);
  const animDurationRef = useRef(8000);

  // Init map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [40.7128, -74.006],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
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

  // Route polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
    if (traveledLayerRef.current) { map.removeLayer(traveledLayerRef.current); traveledLayerRef.current = null; }
    if (carMarkerRef.current) { map.removeLayer(carMarkerRef.current); carMarkerRef.current = null; }

    if (route) {
      // Background (remaining) route
      routeLayerRef.current = L.polyline(route.coordinates, {
        color: '#c8c8c8',
        weight: 6,
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Traveled route (will be updated during animation)
      traveledLayerRef.current = L.polyline([], {
        color: '#1a1a1a',
        weight: 6,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Car starts at pickup
      const startCoord = route.coordinates[0];
      const nextCoord = route.coordinates[1] || startCoord;
      const heading = calcHeading(startCoord, nextCoord);
      carMarkerRef.current = L.marker(startCoord, {
        icon: createCarIcon(heading),
        zIndexOffset: 1000,
      }).addTo(map);

      // Fit map to route
      const bounds = L.latLngBounds(route.coordinates);
      map.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1 });
    }
  }, [route]);

  // Animation
  useEffect(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (!isAnimating || !route) return;

    const coords = route.coordinates;
    // Duration based on route distance (~40 km/h simulated)
    const duration = Math.min(Math.max(route.duration * 1000 * 0.15, 5000), 20000);
    animDurationRef.current = duration;
    animStartRef.current = null;

    const animate = (timestamp) => {
      if (!animStartRef.current) animStartRef.current = timestamp;
      const elapsed = timestamp - animStartRef.current;
      const rawT = Math.min(elapsed / duration, 1);
      const t = ease(rawT);

      const pos = interpolate(coords, t);
      const nextT = Math.min(rawT + 0.01, 1);
      const nextPos = interpolate(coords, ease(nextT));
      const heading = calcHeading(pos, nextPos);

      if (carMarkerRef.current) {
        carMarkerRef.current.setLatLng(pos);
        carMarkerRef.current.setIcon(createCarIcon(heading));
      }

      // Update traveled polyline
      const traveledCount = Math.floor(t * (coords.length - 1));
      const traveledCoords = [...coords.slice(0, traveledCount + 1), pos];
      if (traveledLayerRef.current) {
        traveledLayerRef.current.setLatLngs(traveledCoords);
      }

      // Pan camera to follow car
      if (mapInstanceRef.current && rawT > 0.05) {
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
