<?php
// Final/geocode_proxy.php

header('Content-Type: application/json');

if (!isset($_GET['q']) || empty($_GET['q'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing search query parameter 'q'"]);
    exit;
}

$query = urlencode($_GET['q']);
$nominatim_url = "https://nominatim.openstreetmap.org/search?q=$query&format=json&limit=1";

// CRITICAL: Set a User-Agent header to comply with Nominatim usage policy
// Replace 'YourApplicationName/1.0' with an actual name for production use
$options = [
    "http" => [
        "method" => "GET",
        "header" => "User-Agent: TLIMS_Landlord_App/1.0 (http://localhost)" 
    ]
];
$context = stream_context_create($options);

// Fetch data from Nominatim
$response = @file_get_contents($nominatim_url, false, $context);

if ($response === FALSE) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to fetch data from external geocoding service. Ensure 'allow_url_fopen' is enabled in php.ini."]);
} else {
    // Forward the response directly
    echo $response;
}
?>