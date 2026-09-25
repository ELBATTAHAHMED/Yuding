const http = require('http');

const GATEWAY_PORT = 8888;
const HOST = 'localhost';

function request(method, path, body = null, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: HOST,
      port: GATEWAY_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: timeoutMs,
    }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || raw,
        });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 504, error: 'TIMEOUT' });
    });

    if (data) req.write(data);
    req.end();
  });
}

async function runAudit() {
  console.log('========================================================');
  console.log('--- AUDITING TRAVEL SEARCH VERTICALS VIA GATEWAY:8888 ---');
  console.log('========================================================\n');

  // 1. HOTELS
  console.log('>>> [1. HOTEL SEARCHES]');
  const hotelTests = [
    { destination: 'Marrakech', checkIn: '2026-09-28', checkOut: '2026-10-02', label: 'Marrakech (Near future)' },
    { destination: 'Marrakech', checkIn: '2026-10-25', checkOut: '2026-10-30', label: 'Marrakech (1 month future)' },
    { destination: 'Paris', checkIn: '2026-10-10', checkOut: '2026-10-15', label: 'Paris (2 weeks future)' },
    { destination: 'Rome', checkIn: '2026-11-05', checkOut: '2026-11-10', label: 'Rome (Farther future)' },
  ];

  for (const t of hotelTests) {
    const res = await request('POST', '/travel/hotels/search', {
      destination: t.destination,
      checkIn: t.checkIn,
      checkOut: t.checkOut,
      adults: 2,
      rooms: 1,
      children: 0,
      currency: 'EUR',
      guestNationality: 'MA',
    });
    const resultsCount = res.data?.results?.length ?? (Array.isArray(res.data) ? res.data.length : 'N/A');
    const providerMsg = res.data?.providerMessage || res.data?.message || 'none';
    console.log(`  Hotel: ${t.label} -> Status: ${res.status}, Count: ${resultsCount}, ProviderMsg: "${providerMsg}"`);
  }

  // 2. FLIGHTS
  console.log('\n>>> [2. FLIGHT SEARCHES]');
  const flightTests = [
    { origin: 'CMN', destination: 'CDG', departureDate: '2026-09-28', returnDate: '2026-10-05', label: 'CMN -> CDG (Near future round-trip)' },
    { origin: 'CMN', destination: 'CDG', departureDate: '2026-10-20', label: 'CMN -> CDG (1 month future one-way)' },
    { origin: 'CMN', destination: 'MAD', departureDate: '2026-10-15', returnDate: '2026-10-22', label: 'CMN -> MAD (Round-trip)' },
    { origin: 'CDG', destination: 'FCO', departureDate: '2026-11-10', label: 'CDG -> FCO (One-way)' },
  ];

  for (const t of flightTests) {
    const res = await request('POST', '/travel/flights/search', {
      origin: t.origin,
      destination: t.destination,
      departureDate: t.departureDate,
      returnDate: t.returnDate,
      adults: 1,
      travelClass: 'ECONOMY',
    }, 45000);
    const resultsCount = res.data?.results?.length ?? (Array.isArray(res.data) ? res.data.length : 'N/A');
    const providerMsg = res.data?.providerMessage || res.data?.message || 'none';
    console.log(`  Flight: ${t.label} -> Status: ${res.status}, Count: ${resultsCount}, ProviderMsg: "${providerMsg}"`);
  }

  // 3. ACTIVITIES
  console.log('\n>>> [3. ACTIVITY SEARCHES]');
  const activityTests = [
    { destination: 'Marrakech', date: '2026-09-29', label: 'Marrakech (Near future)' },
    { destination: 'Paris', date: '2026-10-12', label: 'Paris (2 weeks future)' },
    { destination: 'Rome', date: '2026-11-08', label: 'Rome (Farther future)' },
    { destination: 'Chefchaouen', date: '2026-10-01', label: 'Chefchaouen (Unsupported / empty destination)' },
  ];

  for (const t of activityTests) {
    const res = await request('POST', '/travel/activities/search', {
      destination: t.destination,
      date: t.date,
      travelers: 2,
    });
    const resultsCount = res.data?.results?.length ?? (Array.isArray(res.data) ? res.data.length : 'N/A');
    const providerMsg = res.data?.providerMessage || res.data?.message || 'none';
    console.log(`  Activity: ${t.label} -> Status: ${res.status}, Count: ${resultsCount}, ProviderMsg: "${providerMsg}"`);
  }

  // 4. TRANSFERS
  console.log('\n>>> [4. TRANSFER SEARCHES]');
  const transferTests = [
    { pickup: 'Aéroport Marrakech Menara', dropoff: 'Palmeraie Marrakech', date: '2026-09-28', time: '14:00', label: 'RAK Airport -> Palmeraie (Near future)' },
    { pickup: 'Aéroport Mohammed V Casablanca', dropoff: 'Centre Ville Casablanca', date: '2026-10-20', time: '10:00', label: 'CMN Airport -> Centre Ville (1 month future)' },
    { pickup: 'Aéroport Charles de Gaulle Paris', dropoff: 'Tour Eiffel Paris', date: '2026-10-15', time: '12:00', label: 'CDG Airport -> Paris (Supported European)' },
  ];

  for (const t of transferTests) {
    const res = await request('POST', '/travel/transfers/search', {
      pickup: t.pickup,
      dropoff: t.dropoff,
      date: t.date,
      time: t.time,
      passengers: 2,
      currency: 'EUR',
    });
    const resultsCount = res.data?.results?.length ?? (Array.isArray(res.data) ? res.data.length : 'N/A');
    const providerMsg = res.data?.providerMessage || res.data?.message || 'none';
    console.log(`  Transfer: ${t.label} -> Status: ${res.status}, Count: ${resultsCount}, ProviderMsg: "${providerMsg}"`);
  }

  // 5. TRAINS
  console.log('\n>>> [5. TRAIN SEARCHES]');
  const trainTests = [
    { originStation: 'Casablanca Voyageurs', destinationStation: 'Rabat Ville', date: '2026-09-28', label: 'Casablanca Voyageurs -> Rabat Ville (Near future)' },
    { originStation: 'Casablanca Port', destinationStation: 'Marrakech', date: '2026-10-15', label: 'Casablanca Port -> Marrakech (Future)' },
    { originStation: 'Rabat Agdal', destinationStation: 'Kénitra', date: '2026-10-05', label: 'Rabat Agdal -> Kénitra' },
  ];

  for (const t of trainTests) {
    const res = await request('POST', '/travel/trains/search', {
      originStation: t.originStation,
      destinationStation: t.destinationStation,
      date: t.date,
      currency: 'MAD',
    });
    const resultsCount = res.data?.results?.length ?? (Array.isArray(res.data) ? res.data.length : 'N/A');
    const providerMsg = res.data?.providerMessage || res.data?.message || 'none';
    console.log(`  Train: ${t.label} -> Status: ${res.status}, Count: ${resultsCount}, ProviderMsg: "${providerMsg}"`);
  }

  console.log('\n========================================================');
  console.log('--- AUDIT COMPLETED ---');
  console.log('========================================================');
}

runAudit();
