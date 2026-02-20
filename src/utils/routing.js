const VALHALLA_BASE = 'https://valhalla1.openstreetmap.de/route';

// Decode Valhalla's encoded polyline (precision 6)
function decodePolyline(encoded, precision = 6) {
  const factor = Math.pow(10, precision);
  const coords = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lat / factor, lng / factor]);
  }
  return coords;
}

export async function getRoute(from, to) {
  const body = {
    locations: [
      { lat: from.lat, lon: from.lon },
      { lat: to.lat, lon: to.lon },
    ],
    costing: 'auto',
    directions_options: { units: 'km' },
  };

  const res = await fetch(VALHALLA_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('Routing request failed');

  const data = await res.json();
  if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) {
    throw new Error('No route found');
  }

  const summary = data.trip.summary;
  const shape = data.trip.legs[0].shape;
  const coordinates = decodePolyline(shape, 6);

  const distanceM = summary.length * 1000; // km -> m
  const durationS = summary.time;          // seconds

  return {
    coordinates,
    distance: distanceM,
    duration: durationS,
    distanceText: formatDistance(distanceM),
    durationText: formatDuration(durationS),
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
