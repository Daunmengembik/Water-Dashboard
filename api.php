<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");


if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}


$SUPABASE_URL = 'https://hslsweymoroniqzjluse.supabase.co'; 
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbHN3ZXltb3JvbmlxempsdXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDgzOTQsImV4cCI6MjA2MjI4NDM5NH0.RxN7hDAWpyuUFdHFfSXKgJZhWQJPFWulDTT-496Y-c8'; // Replace with your Supabase anon key
$TABLE_NAME = 'flow_data'; 


if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    echo json_encode([
        "message" => "API endpoint is working",
        "method" => "GET",
        "timestamp" => date('Y-m-d H:i:s'),
        "usage" => "Send POST requests with JSON data: {device: 'toilet', flow: 5.2, total: 150.5}",
        "valid_devices" => ['toilet', 'faucet', 'garden', 'device_1', 'device_2', 'device_3']
    ]);
    exit(0);
}

// Handle POST requests (from microcontrollers)
if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    die(json_encode(["error" => "Only POST and GET methods are allowed"]));
}

// Log the raw HTTP request (for debugging)
file_put_contents('request.log', print_r($_SERVER, true) . PHP_EOL . file_get_contents('php://input'), FILE_APPEND);

// Get raw JSON input
$input = file_get_contents('php://input');
file_put_contents('input.log', "Input: " . $input . PHP_EOL, FILE_APPEND);

// Check if input is empty
if (empty($input)) {
    die(json_encode([
        "error" => "Empty input - POST request must contain JSON data", 
        "method" => $_SERVER['REQUEST_METHOD'],
        "content_type" => $_SERVER['CONTENT_TYPE'] ?? 'not set',
        "expected_format" => '{"device": "toilet", "flow": 5.2, "total": 150.5}'
    ]));
}

// Decode JSON
$data = json_decode($input, true);
if ($data === null) {
    die(json_encode([
        "error" => "JSON decode failed",
        "raw" => $input,
        "json_last_error" => json_last_error_msg()
    ]));
}

// Validate required fields
if (!isset($data['device']) || !isset($data['flow']) || !isset($data['total'])) {
    die(json_encode(["error" => "Missing fields (device, flow, total required)", "data" => $data]));
}

// Validate device name - Accept both formats
$validDevices = ['toilet', 'faucet', 'garden', 'device_1', 'device_2', 'device_3'];
if (!in_array($data['device'], $validDevices)) {
    die(json_encode(["error" => "Invalid device name. Must be: toilet, faucet, garden, device_1, device_2, or device_3", "device" => $data['device']]));
}

// Map device_X to descriptive names
$deviceMapping = [
    'device_1' => 'toilet',
    'device_2' => 'faucet', 
    'device_3' => 'garden',
    'toilet' => 'toilet',
    'faucet' => 'faucet',
    'garden' => 'garden'
];

$deviceKey = $deviceMapping[$data['device']];

// Prepare data for Supabase
$supabaseData = [
    'device_name' => $deviceKey,
    'timestamp' => date('Y-m-d\TH:i:s.u\Z'), // ISO 8601 format with timezone
    'flow_rate' => floatval($data['flow']),
    'total_consumed' => floatval($data['total'])
];

// Function to make HTTP request to Supabase
function makeSupabaseRequest($url, $data, $method = 'POST') {
    global $SUPABASE_KEY;
    
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $SUPABASE_KEY,
        'apikey: ' . $SUPABASE_KEY,
        'Prefer: return=minimal'
    ]);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    
    curl_close($ch);
    
    if ($error) {
        throw new Exception("cURL Error: " . $error);
    }
    
    return [
        'response' => $response,
        'http_code' => $httpCode
    ];
}

try {
    // Insert data into Supabase
    $supabaseUrl = $SUPABASE_URL . '/rest/v1/' . $TABLE_NAME;
    $result = makeSupabaseRequest($supabaseUrl, $supabaseData, 'POST');
    
    if ($result['http_code'] >= 200 && $result['http_code'] < 300) {
        // Success
        echo json_encode([
            "status" => "success", 
            "device" => $data['device'],
            "mapped_to" => $deviceKey,
            "message" => "Data saved to Supabase successfully",
            "timestamp" => $supabaseData['timestamp']
        ]);
    } else {
        // Error from Supabase
        $errorResponse = json_decode($result['response'], true);
        throw new Exception("Supabase error (HTTP " . $result['http_code'] . "): " . 
                          ($errorResponse['message'] ?? $result['response']));
    }
    
} catch (Exception $e) {
    // Log error for debugging
    file_put_contents('error.log', 
        date('Y-m-d H:i:s') . " - Error: " . $e->getMessage() . PHP_EOL, 
        FILE_APPEND
    );
    
    // Return error response
    echo json_encode([
        "error" => "Failed to save data to Supabase",
        "details" => $e->getMessage(),
        "device" => $data['device'],
        "timestamp" => date('Y-m-d H:i:s')
    ]);
}
?>   
