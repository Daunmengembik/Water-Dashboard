// api/get-data.js - Replace your get_data.php
export default async function handler(req, res) {
  // Constants
  const SUPABASE_URL = 'https://hslsweymoroniqzjluse.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbHN3ZXltb3JvbmlxempsdXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDgzOTQsImV4cCI6MjA2MjI4NDM5NH0.RxN7hDAWpyuUFdHFfSXKgJZhWQJPFWulDTT-496Y-c8';
  const TABLE_NAME = 'flow_data';
  const DEVICES = ['toilet', 'faucet', 'garden'];
  const DATA_TIMEOUT_SECONDS = 10; // Consider flow data stale after 10 seconds

  // Setup CORS headers
  setupCORS(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const deviceData = await getSupabaseData();
    const response = buildResponse(deviceData);
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('get-data error:', error);
    return res.status(500).json(buildErrorResponse(error));
  }

  // Helper Functions
  function setupCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
  }

  async function getSupabaseData() {
    const deviceData = {};

    for (const device of DEVICES) {
      try {
        const data = await fetchDeviceData(device);
        deviceData[device] = processDeviceData(data, device);
      } catch (error) {
        console.error(`Error fetching data for ${device}:`, error);
        deviceData[device] = getZeroFlowData();
      }
    }

    return deviceData;
  }

  async function fetchDeviceData(device) {
    const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?device_name=eq.${device}&order=timestamp.desc&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  }

  function processDeviceData(data, device) {
    if (!data || data.length === 0) {
      console.log(`No data found for ${device}`);
      return getZeroFlowData();
    }

    const latest = data[0];
    const dataAge = calculateDataAge(latest.timestamp);
    
    // Always preserve the total consumption (cumulative data)
    const totalConsumed = parseFloat(latest.total_consumed) || 0;
    
    // Only reset flow rate if data is too old (flow is real-time, total is cumulative)
    if (dataAge > DATA_TIMEOUT_SECONDS) {
      console.log(`Flow data for ${device} is ${dataAge} seconds old, showing zero flow but keeping total`);
      return {
        flow: 0, // Reset flow rate to zero
        total: totalConsumed, // Keep the total consumption
        timestamp: Math.floor(Date.now() / 1000),
        last_update: latest.timestamp,
        data_age_seconds: dataAge,
        is_recent: false,
        data_status: 'stale_flow_valid_total'
      };
    }

    // Data is recent, return actual values
    return {
      flow: parseFloat(latest.flow_rate) || 0,
      total: totalConsumed,
      timestamp: Math.floor(Date.now() / 1000),
      last_update: latest.timestamp,
      data_age_seconds: dataAge,
      is_recent: true,
      data_status: 'live'
    };
  }

  function getZeroFlowData() {
    return {
      flow: 0,
      total: 0, // Only zero when no data exists at all
      timestamp: Math.floor(Date.now() / 1000),
      last_update: new Date().toISOString(),
      data_age_seconds: 0,
      is_recent: false,
      data_status: 'no_data'
    };
  }

  function calculateDataAge(timestamp) {
    const dataTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    return Math.floor((currentTime - dataTime) / 1000);
  }

  function buildResponse(deviceData) {
    return {
      status: 'success',
      devices: deviceData,
      timestamp: Math.floor(Date.now() / 1000),
      data_source: 'supabase',
      last_fetch: new Date().toISOString(),
      timeout_seconds: DATA_TIMEOUT_SECONDS
    };
  }

  function buildErrorResponse(error) {
    const defaultData = {};
    DEVICES.forEach(device => {
      defaultData[device] = getZeroFlowData();
    });

    return {
      status: 'error',
      message: 'Failed to fetch data',
      error: error.message,
      devices: defaultData,
      timestamp: Math.floor(Date.now() / 1000),
      data_source: 'error_fallback'
    };
  }
}
