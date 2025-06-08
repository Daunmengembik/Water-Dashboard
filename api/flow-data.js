// api/flow-data.js - Replace your api.php
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = 'https://hslsweymoroniqzjluse.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbHN3ZXltb3JvbmlxempsdXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDgzOTQsImV4cCI6MjA2MjI4NDM5NH0.RxN7hDAWpyuUFdHFfSXKgJZhWQJPFWulDTT-496Y-c8';
  const TABLE_NAME = 'flow_data';

  // Handle GET requests
  if (req.method === 'GET') {
    return res.status(200).json({
      message: "API endpoint is working",
      method: "GET",
      timestamp: new Date().toISOString(),
      usage: "Send POST requests with JSON data: {device: 'toilet', flow: 5.2, total: 150.5}",
      valid_devices: ['toilet', 'faucet', 'garden', 'device_1', 'device_2', 'device_3']
    });
  }

  // Handle POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Only POST and GET methods are allowed" });
  }

  const data = req.body;

  // Validate required fields
  if (!data.device || data.flow === undefined || data.total === undefined) {
    return res.status(400).json({
      error: "Missing fields (device, flow, total required)",
      data: data
    });
  }

  // Validate device name
  const validDevices = ['toilet', 'faucet', 'garden', 'device_1', 'device_2', 'device_3'];
  if (!validDevices.includes(data.device)) {
    return res.status(400).json({
      error: "Invalid device name. Must be: toilet, faucet, garden, device_1, device_2, or device_3",
      device: data.device
    });
  }

  // Map device names
  const deviceMapping = {
    'device_1': 'toilet',
    'device_2': 'faucet',
    'device_3': 'garden',
    'toilet': 'toilet',
    'faucet': 'faucet',
    'garden': 'garden'
  };

  const deviceKey = deviceMapping[data.device];

  // Prepare data for Supabase
  const supabaseData = {
    device_name: deviceKey,
    timestamp: new Date().toISOString(),
    flow_rate: parseFloat(data.flow),
    total_consumed: parseFloat(data.total)
  };

  try {
    // Insert data into Supabase
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

    if (response.ok) {
      return res.status(200).json({
        status: "success",
        device: data.device,
        mapped_to: deviceKey,
        message: "Data saved to Supabase successfully",
        timestamp: supabaseData.timestamp
      });
    } else {
      const errorText = await response.text();
      throw new Error(`Supabase error (HTTP ${response.status}): ${errorText}`);
    }

  } catch (error) {
    console.error('Error saving to Supabase:', error);
    return res.status(500).json({
      error: "Failed to save data to Supabase",
      details: error.message,
      device: data.device,
      timestamp: new Date().toISOString()
    });
  }
}
