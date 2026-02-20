const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function searchAddress(query, limit = 8) {
  if (!query || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: String(limit),
    addressdetails: '1',
    namedetails: '1',
    countrycodes: 'us',
    'accept-language': 'en',
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'UberLikeNavigationApp/1.0',
    },
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
    namedetails: '1',
    'accept-language': 'en',
  });

  const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'UberLikeNavigationApp/1.0',
    },
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
  const nameDetails = item.namedetails || {};

  // For named places (Times Square, Empire State Building, etc.) use the place name
  const placeName = item.name || nameDetails['name:en'] || nameDetails.name;

  // Build street address string
  const streetParts = [];
  if (addr.house_number) streetParts.push(addr.house_number);
  if (addr.road) streetParts.push(addr.road);
  const street = streetParts.join(' ');

  // Decide primary label
  let primary = '';
  if (placeName && placeName !== addr.road) {
    primary = placeName;
  } else if (street) {
    primary = street;
  } else if (addr.amenity) {
    primary = addr.amenity;
  } else if (addr.building) {
    primary = addr.building;
  } else {
    primary = (item.display_name || '').split(',')[0].trim();
  }

  // Locality
  const city =
    addr.city || addr.town || addr.suburb || addr.borough || addr.village || '';

  const parts = [primary];
  if (city && city !== primary) parts.push(city);
  if (addr.state) parts.push(addr.state);

  return parts.filter(Boolean).join(', ');
}
