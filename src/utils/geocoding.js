const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function searchAddress(query, limit = 5) {
  if (!query || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: String(limit),
    addressdetails: '1',
    countrycodes: '',
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: { 'Accept-Language': 'en' },
  });

  if (!res.ok) throw new Error('Geocoding request failed');

  const data = await res.json();
  return data.map((item) => ({
    id: item.place_id,
    displayName: item.display_name,
    shortName: buildShortName(item),
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    type: item.type,
    category: item.category,
  }));
}

export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'json',
    addressdetails: '1',
  });

  const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: { 'Accept-Language': 'en' },
  });

  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  return {
    displayName: data.display_name,
    shortName: buildShortName(data),
    lat: parseFloat(data.lat),
    lon: parseFloat(data.lon),
  };
}

function buildShortName(item) {
  const addr = item.address || {};
  const parts = [];
  if (addr.amenity) parts.push(addr.amenity);
  else if (addr.building) parts.push(addr.building);
  else if (addr.road) parts.push(addr.road);
  else if (item.name) parts.push(item.name);

  if (addr.city) parts.push(addr.city);
  else if (addr.town) parts.push(addr.town);
  else if (addr.village) parts.push(addr.village);

  if (addr.state) parts.push(addr.state);

  return parts.length > 0
    ? parts.join(', ')
    : (item.display_name || '').split(',').slice(0, 3).join(',').trim();
}
