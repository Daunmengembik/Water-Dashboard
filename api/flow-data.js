// api/flow-data.js - Replace your api.php
export default async function handler(req, res) {
  // Constants
  const SUPABASE_URL = 'https://hslsweymoroniqzjluse.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbHN3ZXltb3JvbmlxempsdXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDgzOTQsImV4cCI6MjA2MjI4NDM5NH0.RxN7hDAWpyuUFdHFfSXKgJZhWQJPFWulDTT-496Y-c8';
  const TABLE_NAME = 'flow_data';
  const VALID_DEVICES = ['toilet', 'faucet', 'garden', 'device_1', 'device_2', 'device_3'];
  const DEVICE_MAPPING = {
    'device_1': 'toilet',
    'device_2': 'faucet',
    'device_3': 'garden',
    'toilet': 'toilet',
    'faucet': 'faucet',
    'garden': 'garden'
  };

  // Setup CORS headers
  setupCORS(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Route handling
  switch (req.method) {
    case 'GET':
      return handleGetRequest(res);
    case 'POST':
      return await handlePostRequest(req, res);
    default:
      return res.status(405).json({ 
        error: "Only POST and GET methods are allowed" 
      });
  }

  // Helper Functions
  function setupCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
  }

  function handleGetRequest(res) {
    return res.status(200).json({
      message: "API endpoint is working",
      method: "GET",
      timestamp: new Date().toISOString(),
      usage: "Send POST requests with JSON data: {device: 'toilet', flow: 5.2, total: 150.5}",
      valid_devices: VALID_DEVICES,
      device_mapping: DEVICE_MAPPING
    });
  }

  async function handlePostRequest(req, res) {
    try {
      // Validate request data
      const validationError = validateRequestData(req.body);
      if (validationError) {
        return res.status(400).json(validationError);
      }

      // Process and save data
      const result = await saveToSupabase(req.body);
      return res.status(200).json(result);

    } catch (error) {
      console.error('Error processing POST request:', error);
      return res.status(500).json({
        error: "Failed to save data to Supabase",
        details: error.message,
        device: req.body?.device,
        timestamp: new Date().toISOString()
      });
    }
  }

  function validateRequestData(data) {
    // Check required fields
    if (!data.device || data.flow === undefined || data.total === undefined) {
      return {
        error: "Missing required fields",
        required: ["device", "flow", "total"],
        received: data
      };
    }

    // Validate device name
    if (!VALID_DEVICES.includes(data.device)) {
      return {
        error: "Invalid device name",
        valid_devices: VALID_DEVICES,
        received_device: data.device
      };
    }

    // Validate numeric values
    if (isNaN(parseFloat(data.flow)) || isNaN(parseFloat(data.total))) {
      return {
        error: "Flow and total must be numeric values",
        received_flow: data.flow,
        received_total: data.total
      };
    }

    return null; // No validation errors
  }

  async function saveToSupabase(data) {
    const deviceKey = DEVICE_MAPPING[data.device];
    
    const supabaseData = {
      device_name: deviceKey,
      timestamp: new Date().toISOString(),
      flow_rate: parseFloat(data.flow),
      total_consumed: parseFloat(data.total)
    };

    const supabaseUrl = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}`;
    
    const response = await fetch(supabaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(supabaseData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase error (HTTP ${response.status}): ${errorText}`);
    }

    return {
      status: "success",
      device: data.device,
      mapped_to: deviceKey,
      message: "Data saved to Supabase successfully",
      timestamp: supabaseData.timestamp,
      saved_data: {
        flow_rate: supabaseData.flow_rate,
        total_consumed: supabaseData.total_consumed
      }
    };
  }
}
