export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Backend API routes
    if (url.pathname === '/api/vehicle') return handleVehicle(url);
    if (url.pathname === '/api/mobile') return handleMobile(url);
    if (url.pathname === '/api/ip') return handleIP(url);

    // Frontend route
    return new Response(handleFrontend(), {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

// Demo/back-end handlers. These return safe, educational/demo data only.
async function handleVehicle(url) {
  const rc = (url.searchParams.get('rc') || '').trim().toUpperCase();
  if (!rc) return jsonResponse({ success: false, message: 'Missing RC number' }, 400);

  // IMPORTANT: This worker returns demo data only. Configure real API endpoints via
  // environment variables or your own backend. See README.md for instructions.

  return jsonResponse({
    success: true,
    developer: 'rdw3w (demo)',
    vehicle_info: {
      registration_number: rc,
      ownership: {
        owner_name: '[REDACTED] (demo)',
        father_name: 'N/A',
        registered_rto: 'DEMO RTO'
      },
      vehicle_specs: {
        model_name: 'DEMO MODEL',
        maker_model: 'DEMO MAKER',
        vehicle_class: 'LMV',
        fuel_type: 'PETROL'
      },
      insurance: { insurance_company: 'DEMO INSURANCE', insurance_expiry: 'N/A' },
      validity: { fitness_upto: 'N/A', puc_status: 'N/A' }
    },
    note: 'This is demo data for UI/testing. Configure real APIs in README before using live lookup.'
  });
}

async function handleMobile(url) {
  const number = (url.searchParams.get('mobile') || '').trim();
  if (!number) return jsonResponse({ success: false, message: 'Missing mobile number' }, 400);

  return jsonResponse({
    success: true,
    developer: 'rdw3w (demo)',
    mobile: number,
    name: '[REDACTED] (demo)',
    address: 'DEMO ADDRESS',
    note: 'Demo response. Replace with real API integration if you have lawful access.'
  });
}

async function handleIP(url) {
  const ip = (url.searchParams.get('ip') || '').trim();
  if (!ip) return jsonResponse({ success: false, message: 'Missing ip parameter' }, 400);

  // Demo geo info. Do not rely on this for real lookups.
  return jsonResponse({
    status: 'success',
    query: ip,
    country: 'DEMO COUNTRY',
    regionName: 'DEMO REGION',
    city: 'DEMO CITY',
    zip: '000000',
    lat: 0,
    lon: 0,
    isp: 'DEMO ISP',
    note: 'Demo data. Configure real IP provider if needed.'
  });
}

function handleFrontend() {
  // Minimal HTML generated here. The full UI lives in public/index.html but
  // returning a small fallback page helps if someone hits the worker root.
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OSINT HUB - Demo</title></head><body><h2>OSINT HUB - Demo</h2><p>This Worker serves demo backend endpoints for vehicle/mobile/ip lookups. Add the UI in /public/ or deploy the included frontend.</p></body></html>`;
}
