const http = require('http');

const GATEWAY_URL = 'http://localhost:8888';

async function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, GATEWAY_URL);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let data = buffer.toString('utf-8');
        try {
          data = JSON.parse(data);
        } catch {
          // Keep string
        }
        resolve({ status: res.statusCode, headers: res.headers, data });
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function registerOrLogin(email, password, name) {
  const regRes = await request({
    method: 'POST',
    path: '/auth/register',
    headers: { 'Content-Type': 'application/json' },
  }, { email, password, firstName: name, lastName: 'Test' });

  if (regRes.status === 200 || regRes.status === 201) {
    return regRes.data.accessToken || regRes.data.token;
  }

  // Fallback to login
  const loginRes = await request({
    method: 'POST',
    path: '/auth/login',
    headers: { 'Content-Type': 'application/json' },
  }, { email, password });

  if (loginRes.status === 200) {
    return loginRes.data.accessToken || loginRes.data.token;
  }

  throw new Error(`Failed to authenticate ${email}: ${JSON.stringify(loginRes.data)}`);
}

async function runPhase50Tests() {
  console.log('====================================================');
  console.log('--- STARTING PHASE 50 E2E INTEGRATION TEST SUITE ---');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate User A and User B
    console.log('[STEP 1] Authenticating test users...');
    const userAToken = await registerOrLogin('phase50_user_a@yuding.ma', 'Password123!', 'UserA');
    const userBToken = await registerOrLogin('phase50_user_b@yuding.ma', 'Password123!', 'UserB');
    assert(Boolean(userAToken), 'User A token acquired');
    assert(Boolean(userBToken), 'User B token acquired');

    const authHeadersA = {
      'Authorization': `Bearer ${userAToken}`,
      'Content-Type': 'application/json',
    };
    const authHeadersB = {
      'Authorization': `Bearer ${userBToken}`,
      'Content-Type': 'application/json',
    };

    // 2. Test Favorites CRUD & Deduplication
    console.log('\n[STEP 2] Testing Favorites (Add, Deduplicate, List, Anti-IDOR, Delete)...');
    
    // Add Hotel Favorite
    const favHotelReq = {
      resourceType: 'HOTEL',
      resourceReference: 'HTL-TEST-001',
      title: 'Grand Hotel Casablanca',
      destination: 'Casablanca, Maroc',
      thumbnailUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
      providerLabel: 'NUITEE',
      priceSnapshot: 850.00,
      currencySnapshot: 'MAD',
    };

    const addFav1 = await request({
      method: 'POST',
      path: '/api/account/favorites',
      headers: authHeadersA,
    }, favHotelReq);

    assert(addFav1.status === 201, `Hotel favorite created (Status ${addFav1.status})`);
    assert(addFav1.data.publicReference && addFav1.data.publicReference.startsWith('FAV-'), `Public reference starts with FAV- (${addFav1.data.publicReference})`);
    assert(addFav1.data.priceSnapshot === 850 || addFav1.data.priceSnapshot === 850.0, 'Price snapshot preserved');
    const favHotelRef = addFav1.data.publicReference;

    // Deduplicate: Add same hotel again with updated price
    const addFavDuplicate = await request({
      method: 'POST',
      path: '/api/account/favorites',
      headers: authHeadersA,
    }, { ...favHotelReq, priceSnapshot: 920.00 });

    assert(addFavDuplicate.status === 201 || addFavDuplicate.status === 200, 'Duplicate favorite update accepted');
    assert(addFavDuplicate.data.publicReference === favHotelRef, 'Duplicate favorite reused same publicReference');
    assert(addFavDuplicate.data.priceSnapshot === 920 || addFavDuplicate.data.priceSnapshot === 920.0, 'Price snapshot updated on deduplicated favorite');

    // Add Activity Favorite
    const favActivityReq = {
      resourceType: 'ACTIVITY',
      resourceReference: 'ACT-TEST-002',
      title: 'Visite guidée Médina',
      destination: 'Marrakech, Maroc',
      providerLabel: 'HBX',
      priceSnapshot: 250.00,
      currencySnapshot: 'MAD',
    };

    const addFav2 = await request({
      method: 'POST',
      path: '/api/account/favorites',
      headers: authHeadersA,
    }, favActivityReq);

    assert(addFav2.status === 201, 'Activity favorite created');
    const favActRef = addFav2.data.publicReference;

    // List User A's Favorites
    const listFavsA = await request({
      method: 'GET',
      path: '/api/account/favorites',
      headers: authHeadersA,
    });
    assert(listFavsA.status === 200, 'List favorites returned 200');
    assert(Array.isArray(listFavsA.data), 'Favorites response is an array');
    const userAFavRefs = listFavsA.data.map(f => f.publicReference);
    assert(userAFavRefs.includes(favHotelRef) && userAFavRefs.includes(favActRef), 'Both favorites present in User A list');

    // Anti-IDOR: User B attempts to delete User A's favorite
    const idorDeleteFav = await request({
      method: 'DELETE',
      path: `/api/account/favorites/${favHotelRef}`,
      headers: authHeadersB,
    });
    assert(idorDeleteFav.status === 404, `User B IDOR delete rejected with 404 (got ${idorDeleteFav.status})`);

    // Verify favorite still exists for User A
    const verifyFavStillExists = await request({
      method: 'GET',
      path: '/api/account/favorites',
      headers: authHeadersA,
    });
    assert(verifyFavStillExists.data.some(f => f.publicReference === favHotelRef), 'User A favorite still exists after IDOR attempt');

    // Delete single favorite by public reference
    const deleteFav1 = await request({
      method: 'DELETE',
      path: `/api/account/favorites/${favHotelRef}`,
      headers: authHeadersA,
    });
    assert(deleteFav1.status === 204, 'User A deleted favorite by public reference (204)');

    // Delete favorite by resource type and reference
    const deleteFavByResource = await request({
      method: 'DELETE',
      path: `/api/account/favorites?type=ACTIVITY&ref=ACT-TEST-002`,
      headers: authHeadersA,
    });
    assert(deleteFavByResource.status === 204, 'User A deleted favorite by resource type & ref (204)');

    // Verify list is now clean
    const verifyFavsEmpty = await request({
      method: 'GET',
      path: '/api/account/favorites',
      headers: authHeadersA,
    });
    assert(verifyFavsEmpty.data.length === 0, 'Favorites list is empty after deletions');

    // 3. Test Saved Trips (Validate AI Ownership, Non-destructive Unsave, Anti-IDOR)
    console.log('\n[STEP 3] Testing Saved Trips (AI Ownership Validation, Save, Unsave, Anti-IDOR)...');

    // Create a real trip plan via ai-service for User A
    const tripPlanReq = {
      origin: 'Casablanca',
      destination: 'Paris',
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      travelers: 2,
      budget: 8000,
      budgetCurrency: 'MAD',
      preferences: ['food', 'museums'],
      pace: 'relaxed',
    };

    const createPlanRes = await request({
      method: 'POST',
      path: '/api/ai/trip-plans',
      headers: authHeadersA,
    }, tripPlanReq);

    assert(createPlanRes.status === 201 || createPlanRes.status === 200, `Phase 48 trip plan created (Status ${createPlanRes.status})`);
    const tripPlanRef = createPlanRes.data.reference;
    assert(tripPlanRef && tripPlanRef.startsWith('TRP-'), `Trip plan reference is valid (${tripPlanRef})`);

    // Anti-IDOR on Save: User B attempts to save User A's trip plan
    const userBSaveAttempt = await request({
      method: 'POST',
      path: '/api/account/saved-trips',
      headers: authHeadersB,
    }, { tripPlanReference: tripPlanRef });
    assert(userBSaveAttempt.status === 404, `User B cannot save User A trip plan (Anti-IDOR status ${userBSaveAttempt.status})`);

    // User A saves their own trip plan
    const userASaveTrip = await request({
      method: 'POST',
      path: '/api/account/saved-trips',
      headers: authHeadersA,
    }, { tripPlanReference: tripPlanRef });

    assert(userASaveTrip.status === 201, `User A saved trip plan successfully (Status ${userASaveTrip.status})`);
    assert(userASaveTrip.data.publicReference && userASaveTrip.data.publicReference.startsWith('STR-'), `Saved trip reference starts with STR- (${userASaveTrip.data.publicReference})`);
    assert(userASaveTrip.data.destinationCity === 'Paris', 'Saved trip populated destination city from AI plan');
    const savedTripRef = userASaveTrip.data.publicReference;

    // List Saved Trips for User A
    const listSavedTrips = await request({
      method: 'GET',
      path: '/api/account/saved-trips',
      headers: authHeadersA,
    });
    assert(listSavedTrips.status === 200, 'List saved trips returned 200');
    assert(listSavedTrips.data.some(st => st.publicReference === savedTripRef), 'Saved trip present in User A list');

    // Anti-IDOR on Unsave: User B attempts to delete User A's saved trip
    const userBIDORDeleteSavedTrip = await request({
      method: 'DELETE',
      path: `/api/account/saved-trips/${savedTripRef}`,
      headers: authHeadersB,
    });
    assert(userBIDORDeleteSavedTrip.status === 404, `User B cannot delete User A saved trip (Status ${userBIDORDeleteSavedTrip.status})`);

    // User A unsaves the trip
    const unsaveRes = await request({
      method: 'DELETE',
      path: `/api/account/saved-trips/${savedTripRef}`,
      headers: authHeadersA,
    });
    assert(unsaveRes.status === 204, 'User A unsaved trip successfully (Status 204)');

    // Verify underlying Trip Plan in ai-service is STILL INTACT (Non-destructive unsave rule!)
    const verifyAiPlanStillExists = await request({
      method: 'GET',
      path: `/api/ai/trip-plans/${tripPlanRef}`,
      headers: authHeadersA,
    });
    assert(verifyAiPlanStillExists.status === 200, 'Underlying AI trip plan remains fully intact after unsave (Non-destructive)');

    // 4. Test Recent Searches (Payload Sanitization, Hash Deduplication, Expiration, Clear)
    console.log('\n[STEP 4] Testing Recent Searches (Sanitization, Deduplication, Expiration, Clear)...');

    // Perform search with injected sensitive fields
    const searchWithInjectedFields = {
      searchType: 'FLIGHT',
      origin: 'CMN',
      destination: 'CDG',
      departureDate: '2026-11-10',
      returnDate: '2026-11-20',
      travelersCount: 2,
      criteriaPayload: {
        originCity: 'Casablanca',
        destinationCity: 'Paris',
        travelClass: 'ECONOMY',
        // Injected fields that must be stripped:
        adminAccess: true,
        role: 'ROLE_ADMIN',
        apiKey: 'super-secret-key-12345',
        creditCard: '4111111111111111',
      },
    };

    const addSearch1 = await request({
      method: 'POST',
      path: '/api/account/recent-searches',
      headers: authHeadersA,
    }, searchWithInjectedFields);

    assert(addSearch1.status === 201, 'Recent search recorded (Status 201)');
    assert(addSearch1.data.publicReference && addSearch1.data.publicReference.startsWith('SRC-'), `Reference starts with SRC- (${addSearch1.data.publicReference})`);
    
    // Verify sanitization
    const storedPayload = addSearch1.data.criteriaPayload || {};
    assert(storedPayload.adminAccess === undefined, 'Injected adminAccess stripped from search payload');
    assert(storedPayload.apiKey === undefined, 'Injected apiKey stripped from search payload');
    assert(storedPayload.creditCard === undefined, 'Injected creditCard stripped from search payload');
    assert(storedPayload.originCity === 'Casablanca', 'Allowlisted search criteria preserved');
    const searchRef1 = addSearch1.data.publicReference;

    // Deduplication test: Send exact same search
    const addSearchDuplicate = await request({
      method: 'POST',
      path: '/api/account/recent-searches',
      headers: authHeadersA,
    }, searchWithInjectedFields);

    assert(addSearchDuplicate.status === 200 || addSearchDuplicate.status === 201, 'Duplicate search recorded');
    assert(addSearchDuplicate.data.publicReference === searchRef1, 'Duplicate search deduplicated to existing publicReference via SHA-256 criteria hash');

    // Test Expiration Detection: Search with past date
    const expiredSearchReq = {
      searchType: 'HOTEL',
      destination: 'Marrakech',
      departureDate: '2023-01-01',
      returnDate: '2023-01-05',
      travelersCount: 1,
      criteriaPayload: { city: 'Marrakech' },
    };

    const addExpiredSearch = await request({
      method: 'POST',
      path: '/api/account/recent-searches',
      headers: authHeadersA,
    }, expiredSearchReq);

    assert(addExpiredSearch.status === 201, 'Expired search recorded');
    assert(addExpiredSearch.data.isExpired === true, 'Search with past date correctly flagged as isExpired: true');

    // List Searches
    const listSearches = await request({
      method: 'GET',
      path: '/api/account/recent-searches',
      headers: authHeadersA,
    });
    assert(listSearches.status === 200, 'List recent searches returned 200');
    assert(listSearches.data.length === 2, `Exactly 2 unique searches present (got ${listSearches.data.length})`);

    // Delete single search
    const delSearch = await request({
      method: 'DELETE',
      path: `/api/account/recent-searches/${searchRef1}`,
      headers: authHeadersA,
    });
    assert(delSearch.status === 204, 'Single search deleted (Status 204)');

    // Clear all searches
    const clearSearches = await request({
      method: 'DELETE',
      path: '/api/account/recent-searches',
      headers: authHeadersA,
    });
    assert(clearSearches.status === 204, 'Clear all searches returned 204');

    const verifySearchesEmpty = await request({
      method: 'GET',
      path: '/api/account/recent-searches',
      headers: authHeadersA,
    });
    assert(verifySearchesEmpty.data.length === 0, 'Recent searches list is now empty');

    // 5. Test Recently Viewed (Deduplication, Pruning, Clear)
    console.log('\n[STEP 5] Testing Recently Viewed (Record, Deduplicate, Delete, Clear)...');

    const viewHotelReq = {
      resourceType: 'HOTEL',
      resourceReference: 'HTL-VIEW-001',
      title: 'Four Seasons Resort Marrakech',
      destination: 'Marrakech',
      thumbnailUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb',
      providerLabel: 'NUITEE',
    };

    const addView1 = await request({
      method: 'POST',
      path: '/api/account/recent-views',
      headers: authHeadersA,
    }, viewHotelReq);

    assert(addView1.status === 201, 'Recent view recorded (Status 201)');
    assert(addView1.data.publicReference && addView1.data.publicReference.startsWith('VIW-'), `Reference starts with VIW- (${addView1.data.publicReference})`);
    const viewRef1 = addView1.data.publicReference;

    // Deduplication test: Viewing the same hotel again
    const addViewDuplicate = await request({
      method: 'POST',
      path: '/api/account/recent-views',
      headers: authHeadersA,
    }, viewHotelReq);

    assert(addViewDuplicate.status === 200 || addViewDuplicate.status === 201, 'Duplicate view recorded');
    assert(addViewDuplicate.data.publicReference === viewRef1, 'Same item viewed again updates timestamp and reuses publicReference');

    // List recent views
    const listViews = await request({
      method: 'GET',
      path: '/api/account/recent-views',
      headers: authHeadersA,
    });
    assert(listViews.status === 200, 'List recent views returned 200');
    assert(listViews.data.length === 1, `Exactly 1 recent view present after duplicate view (got ${listViews.data.length})`);

    // Delete single view
    const delSingleView = await request({
      method: 'DELETE',
      path: `/api/account/recent-views/${viewRef1}`,
      headers: authHeadersA,
    });
    assert(delSingleView.status === 204, 'Single recent view deleted (Status 204)');

    // Clear all views
    const clearViews = await request({
      method: 'DELETE',
      path: '/api/account/recent-views',
      headers: authHeadersA,
    });
    assert(clearViews.status === 204, 'Clear all views returned 204');

    const verifyViewsEmpty = await request({
      method: 'GET',
      path: '/api/account/recent-views',
      headers: authHeadersA,
    });
    assert(verifyViewsEmpty.data.length === 0, 'Recent views list is now empty');

  } catch (err) {
    console.error('Unhandled error during Phase 50 test suite:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase50Tests();
