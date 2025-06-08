<?php
// get_data.php - Modified to work with Supabase + File Storage
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Configuration - Set your preference
$USE_SUPABASE = true; // Set to false to use file storage only
$USE_FILE_FALLBACK = true; // Use file as backup if Supabase fails

// Supabase configuration (same as api.php)
$SUPABASE_URL = 'https://hslsweymoroniqzjluse.supabase.co'; // Replace with your Supabase URL
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbHN3ZXltb3JvbmlxempsdXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDgzOTQsImV4cCI6MjA2MjI4NDM5NH0.RxN7hDAWpyuUFdHFfSXKgJZhWQJPFWulDTT-496Y-c8'; // Replace with your Supabase anon key
$TABLE_NAME = 'flow_data'; // Your table name

// Device mapping (consistent with api.php)
$deviceMapping = [
    'device_1' => 'toilet',
    'device_2' => 'faucet', 
    'device_3' => 'garden',
    'toilet' => 'toilet',
    'faucet' => 'faucet',
    'garden' => 'garden'
];

// Function to make HTTP request to Supabase
function makeSupabaseRequest($url, $key, $method = 'GET') {
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $key,
        'apikey: ' . $key
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    
    curl_close($ch);
    
    if ($error) {
        throw new Exception("cURL Error: " . $error);
    }
    
    return [
        'response' => $response,
        'http_code' => $httpCode,
        'data' => json_decode($response, true)
    ];
}

// Function to get latest data from Supabase
function getSupabaseData() {
    global $SUPABASE_URL, $SUPABASE_KEY, $TABLE_NAME;
    
    try {
        // Get latest record for each device
        $devices = ['toilet', 'faucet', 'garden'];
        $deviceData = [];
        
        foreach ($devices as $device) {
            $url = $SUPABASE_URL . '/rest/v1/' . $TABLE_NAME . 
                   '?device_name=eq.' . $device . 
                   '&order=timestamp.desc&limit=1';
            
            $result = makeSupabaseRequest($url, $SUPABASE_KEY);
            
            if ($result['http_code'] >= 200 && $result['http_code'] < 300 && 
                $result['data'] && count($result['data']) > 0) {
                
                $latest = $result['data'][0];
                $deviceData[$device] = [
                    'flow' => floatval($latest['flow_rate'] ?? 0),
                    'total' => floatval($latest['total_consumed'] ?? 0),
                    'timestamp' => strtotime($latest['timestamp']),
                    'last_update' => $latest['timestamp']
                ];
            } else {
                // No data found for this device
                $deviceData[$device] = [
                    'flow' => 0,
                    'total' => 0,
                    'timestamp' => time(),
                    'last_update' => date('Y-m-d\TH:i:s.u\Z')
                ];
            }
        }
        
        return $deviceData;
        
    } catch (Exception $e) {
        error_log("Supabase fetch error: " . $e->getMessage());
        return false;
    }
}

// Function to get data from file storage
function getFileData() {
    if (file_exists('sensor_data.json')) {
        $data = file_get_contents('sensor_data.json');
        $deviceData = json_decode($data, true);
        
        if ($deviceData && is_array($deviceData)) {
            // Ensure all devices have data with proper structure
            $devices = ['toilet', 'faucet', 'garden'];
            $processedData = [];
            
            foreach ($devices as $device) {
                if (isset($deviceData[$device]) && is_array($deviceData[$device])) {
                    $processedData[$device] = [
                        'flow' => floatval($deviceData[$device]['flow'] ?? 0),
                        'total' => floatval($deviceData[$device]['total'] ?? 0),
                        'timestamp' => intval($deviceData[$device]['timestamp'] ?? time()),
                        'last_update' => $deviceData[$device]['last_update'] ?? date('Y-m-d H:i:s')
                    ];
                } else {
                    $processedData[$device] = [
                        'flow' => 0,
                        'total' => 0,
                        'timestamp' => time(),
                        'last_update' => date('Y-m-d H:i:s')
                    ];
                }
            }
            
            return $processedData;
        }
    }
    
    return false;
}

// Function to get default data structure
function getDefaultData() {
    $devices = ['toilet', 'faucet', 'garden'];
    $defaultData = [];
    
    foreach ($devices as $device) {
        $defaultData[$device] = [
            'flow' => 0,
            'total' => 0,
            'timestamp' => time(),
            'last_update' => date('Y-m-d H:i:s')
        ];
    }
    
    return $defaultData;
}

// Function to update file storage (when using Supabase as primary)
function updateFileStorage($deviceData) {
    try {
        $jsonData = json_encode($deviceData, JSON_PRETTY_PRINT);
        if ($jsonData !== false) {
            file_put_contents('sensor_data.json', $jsonData);
            return true;
        }
    } catch (Exception $e) {
        error_log("File update error: " . $e->getMessage());
    }
    return false;
}

// Main logic
try {
    $deviceData = false;
    $dataSource = 'default';
    
    // Try Supabase first if enabled
    if ($USE_SUPABASE) {
        $deviceData = getSupabaseData();
        if ($deviceData !== false) {
            $dataSource = 'supabase';
            
            // Update file storage as backup
            if ($USE_FILE_FALLBACK) {
                updateFileStorage($deviceData);
            }
        }
    }
    
    // Fallback to file storage if Supabase failed or is disabled
    if ($deviceData === false && $USE_FILE_FALLBACK) {
        $deviceData = getFileData();
        if ($deviceData !== false) {
            $dataSource = 'file';
        }
    }
    
    // Use default data if both sources fail
    if ($deviceData === false) {
        $deviceData = getDefaultData();
        $dataSource = 'default';
    }
    
    // Prepare response in the format expected by JavaScript
    $response = [
        'status' => 'success',
        'devices' => $deviceData,
        'timestamp' => time(),
        'data_source' => $dataSource,
        'last_fetch' => date('Y-m-d H:i:s')
    ];
    
    // Add data age information for monitoring
    foreach ($deviceData as $device => $data) {
        $age = time() - $data['timestamp'];
        $response['devices'][$device]['data_age_seconds'] = $age;
        $response['devices'][$device]['is_recent'] = $age < 60; // Data is recent if less than 1 minute old
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    // Error handling
    error_log("get_data.php error: " . $e->getMessage());
    
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch data',
        'error' => $e->getMessage(),
        'devices' => getDefaultData(),
        'timestamp' => time(),
        'data_source' => 'error_fallback'
    ]);
}
?>
