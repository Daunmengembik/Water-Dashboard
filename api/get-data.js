// api/get-data.js - Improved version with better debugging
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

  // Function to get latest data from Supabase
  async function getSupabaseData() {
    try {
      const devices = ['toilet', 'faucet', 'garden'];
      const deviceData = {};
      const debugInfo = {};

      for (const device of devices) {
        const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?device_name=eq.${device}&order=timestamp.desc&limit=1`;
        
        console.log(`Fetching data for ${device} from:`, url);
        
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'apikey': SUPABASE_KEY
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          debugInfo[device] = {
            response_status: response.status,
            data_length: data ? data.length : 0,
            raw_response: data
          };
          
          if (data && data.length > 0) {
            const latest = data[0];
            console.log(`Raw data for ${device}:`, latest);
            
            // Better parsing with validation
            let flowRate = 0;
            let totalConsumed = 0;
            
            // Parse flow_rate
            if (latest.flow_rate !== null && latest.flow_rate !== undefined) {
              if (typeof latest.flow_rate === 'number') {
                flowRate = latest.flow_rate;
              } else if (typeof latest.flow_rate === 'string') {
                const parsed = parseFloat(latest.flow_rate);
                flowRate = isNaN(parsed) ? 0 : parsed;
              }
            }
            
            // Parse total_consumed
            if (latest.total_consumed !== null && latest.total_consumed !== undefined) {
              if (typeof latest.total_consumed === 'number') {
                totalConsumed = latest.total_consumed;
              } else if (typeof latest.total_consumed === 'string') {
                const parsed = parseFloat(latest.total_consumed);
                totalConsumed = isNaN(parsed) ? 0 : parsed;
              }
            }
            
            // Convert timestamp to Unix timestamp
            let unixTimestamp;
            try {
              unixTimestamp = Math.floor(new Date(latest.timestamp).getTime() / 1000);
            } catch (e) {
              unixTimestamp = Math.floor(Date.now() / 1000);
            }
            
            deviceData[device] = {
              flow: flowRate,
              total: totalConsumed,
              timestamp: unixTimestamp,
              last_update: latest.timestamp,
              // Debug information
              debug: {
                raw_flow_rate: latest.flow_rate,
                raw_total_consumed: latest.total_consumed,
                flow_rate_type: typeof latest.flow_rate,
                total_consumed_type: typeof latest.total_consumed,
                parsed_flow: flowRate,
                parsed_total: totalConsumed,
                original_timestamp: latest.timestamp,
                unix_timestamp: unixTimestamp
              }
            };
          } else {
            // No data found for this device
            deviceData[device] = {
              flow: 0,
              total: 0,
              timestamp: Math.floor(Date.now() / 1000),
              last_update: new Date().toISOString(),
              debug: {
                message: 'No data found in database'
              }
            };
          }
        } else {
          const errorText = await response.text();
          console.error(`HTTP error for ${device}:`, response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }

      return { data: deviceData, debug: debugInfo };
    } catch (error) {
      console.error('Supabase fetch error:', error);
      return { data: false, error: error.message };
    }
  }

  // Function to get default data structure
  function getDefaultData() {
    const devices = ['toilet', 'faucet', 'garden'];
    const defaultData = {};
    
    devices.forEach(device => {
      defaultData[device] = {
        flow: 0,
        total: 0,
        timestamp: Math.floor(Date.now() / 1000),
        last_update: new Date().toISOString(),
        debug: {
          message: 'Using default data - database fetch failed'
        }
      };
    });
    
    return defaultData;
  }

  try {
    const result = await getSupabaseData();
    let deviceData;
    let dataSource = 'supabase';
    let debugInfo = {};
    
    if (result.data === false) {
      deviceData = getDefaultData();
      dataSource = 'default';
      debugInfo.error = result.error;
    } else {
      deviceData = result.data;
      debugInfo = result.debug;
    }
    
    // Calculate data age
    Object.keys(deviceData).forEach(device => {
      const currentTime = Math.floor(Date.now() / 1000);
      const dataTime = deviceData[device].timestamp;
      const age = currentTime - dataTime;
      
      deviceData[device].data_age_seconds = age;
      deviceData[device].is_recent = age < 300; // Recent if less than 5 minutes old
    });
    
    // Prepare response
    const response = {
      status: 'success',
      devices: deviceData,
      timestamp: Math.floor(Date.now() / 1000),
      data_source: dataSource,
      last_fetch: new Date().toISOString(),
      debug_info: debugInfo,
      server_time: new Date().toISOString(),
      server_unix_time: Math.floor(Date.now() / 1000)
    };
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('get-data error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch data',
      error: error.message,
      devices: getDefaultData(),
      timestamp: Math.floor(Date.now() / 1000),
      data_source: 'error_fallback',
      debug_info: {
        error: error.message,
        stack: error.stack
      }
    });
  }
}
