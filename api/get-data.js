// api/get-data.js - Replace your get_data.php
export default async function handler(req, res) {
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

      for (const device of devices) {
        const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?device_name=eq.${device}&order=timestamp.desc&limit=1`;
        
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'apikey': SUPABASE_KEY
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data && data.length > 0) {
            const latest = data[0];
            console.log(`Debug ${device}:`, latest); // Add debugging
            
            // More robust parsing
            const flowRate = latest.flow_rate;
            const totalConsumed = latest.total_consumed;
            
            deviceData[device] = {
              flow: typeof flowRate === 'number' ? flowRate : parseFloat(flowRate) || 0,
              total: typeof totalConsumed === 'number' ? totalConsumed : parseFloat(totalConsumed) || 0,
              timestamp: Math.floor(Date.now() / 1000), // Use current time instead
              last_update: latest.timestamp,
              // Add raw data for debugging
              raw_flow_rate: latest.flow_rate,
              raw_total_consumed: latest.total_consumed,
              raw_data_type_flow: typeof latest.flow_rate,
              raw_data_type_total: typeof latest.total_consumed
            };
          } else {
            // No data found for this device
            deviceData[device] = {
              flow: 0,
              total: 0,
              timestamp: Math.floor(Date.now() / 1000),
              last_update: new Date().toISOString()
            };
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }

      return deviceData;
    } catch (error) {
      console.error('Supabase fetch error:', error);
      return false;
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
        last_update: new Date().toISOString()
      };
    });
    
    return defaultData;
  }

  try {
    let deviceData = await getSupabaseData();
    let dataSource = 'supabase';
    
    // Use default data if Supabase fails
    if (deviceData === false) {
      deviceData = getDefaultData();
      dataSource = 'default';
    }
    
    // Prepare response
    const response = {
      status: 'success',
      devices: deviceData,
      timestamp: Math.floor(Date.now() / 1000),
      data_source: dataSource,
      last_fetch: new Date().toISOString()
    };
    
    // Add data age information
    Object.keys(deviceData).forEach(device => {
      const age = Math.floor(Date.now() / 1000) - deviceData[device].timestamp;
      response.devices[device].data_age_seconds = age;
      response.devices[device].is_recent = age < 60; // Recent if less than 1 minute old
    });
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('get-data error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch data',
      error: error.message,
      devices: getDefaultData(),
      timestamp: Math.floor(Date.now() / 1000),
      data_source: 'error_fallback'
    });
  }
}
