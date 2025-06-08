// api/get-data.js - Diagnostic version
export default async function handler(req, res) {
  // Disable caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = 'https://hslsweymoroniqzjluse.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbHN3ZXltb3JvbmlxempsdXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDgzOTQsImV4cCI6MjA2MjI4NDM5NH0.RxN7hDAWpyuUFdHFfSXKgJZhWQJPFWulDTT-496Y-c8';
  const TABLE_NAME = 'flow_data';

  try {
    const diagnostics = {};
    
    // Test 1: Try to get all data from table (no filters)
    console.log('=== DIAGNOSTIC TEST 1: Get all data ===');
    const allDataUrl = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?limit=5`;
    const allDataResponse = await fetch(allDataUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      }
    });
    
    diagnostics.test1_all_data = {
      url: allDataUrl,
      status: allDataResponse.status,
      ok: allDataResponse.ok,
      data: allDataResponse.ok ? await allDataResponse.json() : await allDataResponse.text()
    };
    
    // Test 2: Try to get toilet data specifically
    console.log('=== DIAGNOSTIC TEST 2: Get toilet data ===');
    const toiletUrl = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?device_name=eq.toilet&order=timestamp.desc&limit=5`;
    const toiletResponse = await fetch(toiletUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      }
    });
    
    diagnostics.test2_toilet_data = {
      url: toiletUrl,
      status: toiletResponse.status,
      ok: toiletResponse.ok,
      data: toiletResponse.ok ? await toiletResponse.json() : await toiletResponse.text()
    };
    
    // Test 3: Try different ordering
    console.log('=== DIAGNOSTIC TEST 3: Different ordering ===');
    const altOrderUrl = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?device_name=eq.toilet&order=id.desc&limit=3`;
    const altOrderResponse = await fetch(altOrderUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      }
    });
    
    diagnostics.test3_alt_order = {
      url: altOrderUrl,
      status: altOrderResponse.status,
      ok: altOrderResponse.ok,
      data: altOrderResponse.ok ? await altOrderResponse.json() : await altOrderResponse.text()
    };
    
    // Test 4: Try without ordering
    console.log('=== DIAGNOSTIC TEST 4: No ordering ===');
    const noOrderUrl = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?device_name=eq.toilet&limit=3`;
    const noOrderResponse = await fetch(noOrderUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      }
    });
    
    diagnostics.test4_no_order = {
      url: noOrderUrl,
      status: noOrderResponse.status,
      ok: noOrderResponse.ok,
      data: noOrderResponse.ok ? await noOrderResponse.json() : await noOrderResponse.text()
    };

    // Test 5: Check what columns exist
    console.log('=== DIAGNOSTIC TEST 5: Check table structure ===');
    const structureUrl = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=*&limit=1`;
    const structureResponse = await fetch(structureUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      }
    });
    
    diagnostics.test5_structure = {
      url: structureUrl,
      status: structureResponse.status,
      ok: structureResponse.ok,
      data: structureResponse.ok ? await structureResponse.json() : await structureResponse.text()
    };

    // Test 6: Try case-insensitive search
    console.log('=== DIAGNOSTIC TEST 6: Case insensitive search ===');
    const caseUrl = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?device_name=ilike.toilet&limit=3`;
    const caseResponse = await fetch(caseUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      }
    });
    
    diagnostics.test6_case_insensitive = {
      url: caseUrl,
      status: caseResponse.status,
      ok: caseResponse.ok,
      data: caseResponse.ok ? await caseResponse.json() : await caseResponse.text()
    };

    // Now try the original logic with the working query
    let deviceData = {};
    
    // Use the query that worked from diagnostics
    const devices = ['toilet', 'faucet', 'garden'];
    
    for (const device of devices) {
      // Try the simplest query first
      const simpleUrl = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?device_name=eq.${device}&limit=1`;
      
      const response = await fetch(simpleUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Get the most recent record (assuming the last one is most recent)
          const latest = data[data.length - 1];
          
          deviceData[device] = {
            flow: parseFloat(latest.flow_rate) || 0,
            total: parseFloat(latest.total_consumed) || 0,
            timestamp: Math.floor(new Date(latest.timestamp).getTime() / 1000),
            last_update: latest.timestamp,
            debug: {
              raw_data: latest,
              found_records: data.length
            }
          };
        } else {
          deviceData[device] = {
            flow: 0,
            total: 0,
            timestamp: Math.floor(Date.now() / 1000),
            last_update: new Date().toISOString(),
            debug: { message: 'No data found' }
          };
        }
      }
    }

    return res.status(200).json({
      status: 'diagnostic',
      message: 'This is a diagnostic response to debug the Supabase connection',
      diagnostics: diagnostics,
      devices: deviceData,
      timestamp: Math.floor(Date.now() / 1000),
      server_time: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Diagnostic failed',
      error: error.message,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
}
