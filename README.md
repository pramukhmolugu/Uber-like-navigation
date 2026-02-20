# Uber-like Navigation App

A mobile-first ride-hailing navigation app built with **React + Vite + Leaflet**, inspired by the Uber experience.

---

## Screenshots

| Search & Address Autocomplete | Live Route & Car Animation |
|:---:|:---:|
| ![Search screen](screenshots/search.png) | ![Map route](screenshots/map-route.png) |

| Ride Selection | Trip in Progress |
|:---:|:---:|
| ![Ride options](screenshots/ride-options.png) | ![Trip status](screenshots/trip-status.png) |

---

## Features

- **Smart address search** — powered by Nominatim/OpenStreetMap; finds street addresses (e.g. `27 N Tompkins Sq`) and landmarks (e.g. `Times Square`)
- **Autocomplete dropdown** — real-time suggestions as you type with place icons, always visible above the map
- **Interactive map** — Carto Voyager tiles with green parks, colored roads, and full road labels
- **Blue route line** — Uber-brand blue (`#276EF1`) route drawn between pickup and destination
- **White top-down car** — realistic top-down car icon that rotates to face its direction of travel
- **Smooth car animation** — car glides along the route at constant speed (25–45 s depending on route length)
- **Ride options panel** — UberX, Comfort, UberXL, Uber Black with dynamic pricing
- **Trip status screen** — driver details, ETA, cancel/re-book
- **Map pin mode** — tap the map to set pickup or destination directly

---

## Tech Stack

| Layer | Library |
|---|---|
| UI framework | React 18 + Vite |
| Map | Leaflet.js |
| Map tiles | Carto Voyager (free, no API key) |
| Geocoding | Nominatim / OpenStreetMap |
| Routing | OSRM (open source routing) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## How to Use

1. **Set pickup** — type an address or tap "Pin Pickup" to click the map
2. **Set destination** — type a destination (e.g. `Times Square`) or tap "Pin Dest"
3. The app calculates the route and shows distance + ETA
4. Tap **"See ride options →"** to choose UberX / Comfort / UberXL / Uber Black
5. Tap **"Book"** to start the trip — watch the white car drive the route

---

## Project Structure

```
src/
├── components/
│   ├── MapView.jsx       # Leaflet map, markers, route, car animation
│   ├── AddressInput.jsx  # Search input with portal dropdown
│   ├── RidePanel.jsx     # Ride type selector + pricing
│   └── TripStatus.jsx    # In-trip driver info screen
├── utils/
│   ├── geocoding.js      # Nominatim search + reverse geocode
│   └── routing.js        # OSRM route fetch
└── App.jsx               # App state machine (SEARCH → CHOOSE_RIDE → IN_TRIP)
```

---

## Adding Screenshots

Drop your screenshots into the `screenshots/` folder with these names:

- `screenshots/search.png` — the search/autocomplete screen
- `screenshots/map-route.png` — the map with the blue route and car
- `screenshots/ride-options.png` — the ride selection panel
- `screenshots/trip-status.png` — the in-trip status screen

Then commit and push:

```bash
git add screenshots/
git commit -m "Add app screenshots"
git push
```
