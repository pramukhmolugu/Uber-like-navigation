const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export async function getRoute(from, to) {
  // from/to: { lat, lon }
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
  });

  const res = await fetch(`${OSRM_BASE}/${coords}?${params}`);
  if (!res.ok) throw new Error('Routing request failed');

  const data = await res.json();
  if (!data.routes || data.routes.length === 0) throw new Error('No route found');

  const route = data.routes[0];
  const coordinates = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

  return {
    coordinates,
    distance: route.distance, // meters
    duration: route.duration, // seconds
    distanceText: formatDistance(route.distance),
    durationText: formatDuration(route.duration),
  };
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}
