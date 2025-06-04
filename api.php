<?php
// api.php - Modified to handle data from 3 microcontrollers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Log the raw HTTP request (for debugging)
file_put_contents('request.log', print_r($_SERVER, true) . PHP_EOL . file_get_contents('php://input'), FILE_APPEND);

// Get raw JSON input
$input = file_get_contents('php://input');
file_put_contents('input.log', "Input: " . $input . PHP_EOL, FILE_APPEND);

// Check if input is empty
if (empty($input)) {
    die(json_encode(["error" => "Empty input", "headers" => getallheaders()]));
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

// Map device_X to descriptive names for storage
$deviceMapping = [
    'device_1' => 'toilet',
    'device_2' => 'faucet', 
    'device_3' => 'garden',
    'toilet' => 'toilet',
    'faucet' => 'faucet',
    'garden' => 'garden'
];

$deviceKey = $deviceMapping[$data['device']];

// Read existing data
$allData = [];
if (file_exists('sensor_data.json')) {
    $existingData = file_get_contents('sensor_data.json');
    $allData = json_decode($existingData, true) ?: [];
}

// Update data for the specific device
$allData[$deviceKey] = [
    'flow' => floatval($data['flow']),
    'total' => floatval($data['total']),
    'timestamp' => time(),
    'last_update' => date('Y-m-d H:i:s'),
    'original_device_id' => $data['device'] // Keep track of original ID
];

// Save updated data
if (file_put_contents('sensor_data.json', json_encode($allData, JSON_PRETTY_PRINT))) {
    echo json_encode([
        "status" => "success", 
        "device" => $data['device'],
        "mapped_to" => $deviceKey,
        "message" => "Data saved successfully"
    ]);
} else {
    die(json_encode(["error" => "Failed to save data"]));
}
?>
