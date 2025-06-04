<?php
// get_data.php - Modified to return data from all 3 devices
header("Access-Control-Allow-Origin: *"); 
header("Content-Type: application/json");

// Read saved data
if (file_exists('sensor_data.json')) {
    $data = file_get_contents('sensor_data.json');
    $deviceData = json_decode($data, true);
    
    if ($deviceData) {
        // Ensure all devices have data (provide defaults if missing)
        $defaultData = ['flow' => 0, 'total' => 0, 'timestamp' => time(), 'last_update' => date('Y-m-d H:i:s')];
        
        $response = [
            'devices' => [
                'toilet' => $deviceData['toilet'] ?? $defaultData,
                'faucet' => $deviceData['faucet'] ?? $defaultData,
                'garden' => $deviceData['garden'] ?? $defaultData
            ],
            'timestamp' => time(),
            'status' => 'success'
        ];
        
        echo json_encode($response);
    } else {
        // Return default structure if JSON is invalid
        echo json_encode([
            'devices' => [
                'toilet' => ['flow' => 0, 'total' => 0, 'timestamp' => time(), 'last_update' => date('Y-m-d H:i:s')],
                'faucet' => ['flow' => 0, 'total' => 0, 'timestamp' => time(), 'last_update' => date('Y-m-d H:i:s')],
                'garden' => ['flow' => 0, 'total' => 0, 'timestamp' => time(), 'last_update' => date('Y-m-d H:i:s')]
            ],
            'timestamp' => time(),
            'status' => 'default'
        ]);
    }
} else {
    // Return default values if file doesn't exist
    echo json_encode([
        'devices' => [
            'toilet' => ['flow' => 0, 'total' => 0, 'timestamp' => time(), 'last_update' => date('Y-m-d H:i:s')],
            'faucet' => ['flow' => 0, 'total' => 0, 'timestamp' => time(), 'last_update' => date('Y-m-d H:i:s')],
            'garden' => ['flow' => 0, 'total' => 0, 'timestamp' => time(), 'last_update' => date('Y-m-d H:i:s')]
        ],
        'timestamp' => time(),
        'status' => 'no_file'
    ]);
}
?>