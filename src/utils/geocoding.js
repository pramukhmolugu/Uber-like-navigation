const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]);

const STREET_SUFFIXES = new Set([
  'ST','STREET','AVE','AVENUE','BLVD','BOULEVARD','DR','DRIVE','RD','ROAD',
  'LN','LANE','CT','COURT','PL','PLACE','WAY','TER','TERRACE','CIR','CIRCLE',
  'SQ','SQUARE','HWY','HIGHWAY','PKWY','PKY','PARKWAY','FWY','FREEWAY',
  'TPKE','TURNPIKE','EXPY','EXPRESSWAY','LOOP','PASS','TRL','TRAIL','ALY',
  'N','S','E','W','NE','NW','SE','SW',
]);

/**
 * Attempt to parse a free-text US address into street / city / state components.
 * Returns null if the query doesn't look like a structured address.
 */
function parseAddressComponents(query) {
  const q = query.trim().replace(/\s{2,}/g, ' ');

  // --- Comma-separated format: "street, city, state [zip]" ---
  if (q.includes(',')) {
    const parts = q.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const street = parts[0];

      // Third part may be "PA" or "PA 19335"
      let state = '';
      let city = parts[1];

      if (parts[2]) {
        const stateCandidate = parts[2].trim().split(/\s+/)[0].toUpperCase();
        if (US_STATES.has(stateCandidate)) {
          state = stateCandidate;
        }
      }

      // If state is still empty, last word of city part might be state
      if (!state) {
        const cityWords = city.split(/\s+/);
        const lastWord = cityWords[cityWords.length - 1].toUpperCase();
        if (US_STATES.has(lastWord)) {
          state = lastWord;
          city = cityWords.slice(0, -1).join(' ');
        }
      }

      if (street && city) return { street, city, state };
    }
  }

  // --- Space-separated: "123 N Tompkins Sq Downingtown PA" ---
  const words = q.split(/\s+/);

  // Find state abbreviation — check last word, or 2nd-to-last if last is a zip
  let stateIdx = -1;
  if (words.length >= 2 && US_STATES.has(words[words.length - 1].toUpperCase())) {
    stateIdx = words.length - 1;
  } else if (
    words.length >= 3 &&
    /^\d{5}(-\d{4})?$/.test(words[words.length - 1]) &&
    US_STATES.has(words[words.length - 2].toUpperCase())
  ) {
    stateIdx = words.length - 2;
  }

  if (stateIdx < 2) return null; // not enough tokens to split

  const state = words[stateIdx].toUpperCase();
  const before = words.slice(0, stateIdx);

  // Try last word before state as a single-word city
  const lastBeforeState = before[before.length - 1];
  if (lastBeforeState && !STREET_SUFFIXES.has(lastBeforeState.toUpperCase())) {
    const street = before.slice(0, -1).join(' ');
    if (street.length > 0) {
      return { street, city: lastBeforeState, state };
    }
  }

  // Try last 2 words as a multi-word city (e.g. "New York", "Los Angeles")
  if (
    before.length >= 3 &&
    !STREET_SUFFIXES.has(before[before.length - 2].toUpperCase())
  ) {
    const city = before.slice(-2).join(' ');
    const street = before.slice(0, -2).join(' ');
    if (street.length > 0) {
      return { street, city, state };
    }
  }

  return null;
}

async function nominatimFetch(params) {
  const urlParams = new URLSearchParams({
    format: 'json',
    limit: '8',
    addressdetails: '1',
    namedetails: '1',
    countrycodes: 'us',
    'accept-language': 'en',
    dedupe: '1',
    ...params,
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${urlParams}`, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'UberLikeNavigationApp/1.0',
    },
  });
  if (!res.ok) throw new Error('Geocoding request failed');
  return res.json();
}

function toResult(item) {
  return {
    id: item.place_id,
    displayName: item.display_name,
    shortName: buildShortName(item),
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    type: item.type,
    category: item.category,
    hasHouseNumber: !!(item.address && item.address.house_number),
  };
}

export async function searchAddress(query, limit = 8) {
  if (!query || query.trim().length < 2) return [];

  const parsed = parseAddressComponents(query);

  // Fire unstructured search + (optionally) structured search in parallel
  const searches = [
    nominatimFetch({ q: query, limit: String(limit) }).catch(() => []),
  ];

  if (parsed) {
    const structuredParams = { country: 'us', limit: String(limit) };
    if (parsed.street) structuredParams.street = parsed.street;
    if (parsed.city)   structuredParams.city   = parsed.city;
    if (parsed.state)  structuredParams.state  = parsed.state;
    searches.push(nominatimFetch(structuredParams).catch(() => []));

    // Also try without city in case the split was off
    if (parsed.state && parsed.street) {
      searches.push(
        nominatimFetch({ street: parsed.street, state: parsed.state, country: 'us', limit: String(limit) }).catch(() => [])
      );
    }
  }

  const arrays = await Promise.all(searches);

  // Merge + deduplicate, preserving insertion order
  const seenIds = new Set();
  const merged = [];
  for (const arr of arrays) {
    for (const item of arr) {
      if (!seenIds.has(item.place_id)) {
        seenIds.add(item.place_id);
        merged.push(toResult(item));
      }
    }
  }

  // Sort: exact house-number matches first, then everything else
  merged.sort((a, b) => (b.hasHouseNumber ? 1 : 0) - (a.hasHouseNumber ? 1 : 0));

  return merged.slice(0, limit);
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

  const placeName = item.name || nameDetails['name:en'] || nameDetails.name;

  const streetParts = [];
  if (addr.house_number) streetParts.push(addr.house_number);
  if (addr.road) streetParts.push(addr.road);
  const street = streetParts.join(' ');

  let primary = '';
  if (street) {
    // Street address with house number takes priority — it's the most specific result
    primary = street;
  } else if (placeName && placeName !== addr.road) {
    primary = placeName;
  } else if (addr.amenity) {
    primary = addr.amenity;
  } else if (addr.building) {
    primary = addr.building;
  } else {
    primary = (item.display_name || '').split(',')[0].trim();
  }

  const city =
    addr.city || addr.town || addr.suburb || addr.borough || addr.village || '';

  const parts = [primary];
  if (city && city !== primary) parts.push(city);
  if (addr.state) parts.push(addr.state);

  return parts.filter(Boolean).join(', ');
}
