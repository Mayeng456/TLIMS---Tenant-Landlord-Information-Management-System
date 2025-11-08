<?php
// FINAL/add_property.php - MODIFIED for 'coming soon' status

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
session_start();
header('Content-Type: application/json');
error_reporting(E_ALL);


// === DATABASE CONNECTION ===
$conn = new mysqli('localhost', 'root', '', 'tlims_db');
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// === AUTH CHECK ===
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    exit;
}
$landlord_id = (int)$_SESSION['user_id'];

// === GET FORM DATA ===
$title       = trim($_POST['prop-title'] ?? '');
$property_type = strtolower(trim($_POST['prop-type'] ?? 'apartment')); // NEW: Get from dropdown
$location    = trim($_POST['prop-location'] ?? '');
$bedrooms    = max(1, intval($_POST['prop-bedrooms'] ?? 0));
$price       = max(0.01, floatval($_POST['prop-price'] ?? 0));
$description = trim($_POST['prop-desc'] ?? '');
$status      = $_POST['prop-status'] ?? 'Available Now';
$amenities   = trim($_POST['amenities'] ?? '');

// NEW: GET COORDINATES
$latitude    = floatval($_POST['prop-lat'] ?? 0);
$longitude   = floatval($_POST['prop-lng'] ?? 0);


// === VALIDATE REQUIRED FIELDS ===
if (empty($title) || empty($property_type) || empty($location) || $bedrooms <= 0 || $price <= 0) {
    echo json_encode(['success' => false, 'error' => 'Please fill all required fields: Title, Type, Location, Bedrooms, Price']);
    exit;
}

// === VALIDATE COORDINATES (CRITICAL) ===
if ($latitude === 0.0 || $longitude === 0.0) {
    echo json_encode(['success' => false, 'error' => 'Property coordinates are required. Please use the map locator.']);
    exit;
}


// === MAP STATUS (UPDATED FOR COMING SOON) ===
$db_status = match ($status) {
    'Available Now'     => 'available',
    'Currently Occupied'=> 'rented',
    'Coming Soon'       => 'coming soon', // <--- GI-USAB
    default             => 'available'
};

// === UPLOAD DIRECTORY (RELATIVE TO PROJECT) ===
$uploadDir = __DIR__ . '/uploads/properties/';
$webPath   = 'uploads/properties/'; // This is what goes in DB

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// === HANDLE PHOTOS (0–3) ===
$photos = [];
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$maxFileSize = 5 * 1024 * 1024; // 5MB

if (isset($_FILES['prop-photos']) && is_array($_FILES['prop-photos']['name'])) {
    $files = $_FILES['prop-photos'];
    $total = count($files['name']);

    for ($i = 0; $i < $total && $i < 3; $i++) {
        if ($files['error'][$i] !== 0) continue;

        $tmpName = $files['tmp_name'][$i];
        $origName = $files['name'][$i];
        $size = $files['size'][$i];
        $mime = mime_content_type($tmpName);

        // Validate
        if ($size > $maxFileSize) {
            continue; // Skip large files
        }
        if (!in_array($mime, $allowedTypes)) {
            continue; // Skip invalid type
        }

        $ext = pathinfo($origName, PATHINFO_EXTENSION);
        $filename = 'prop_' . uniqid() . '.' . strtolower($ext);
        $filePath = $uploadDir . $filename;
        $webUrl   = $webPath . $filename;

        if (move_uploaded_file($tmpName, $filePath)) {
            $photos[] = $webUrl; // ← ONLY THIS GOES IN DB
        }
    }
}

$photosJson = json_encode($photos); // e.g. ["uploads/properties/prop_abc123.jpg"]

// === DETERMINE PROPERTY TYPE (Now relies on dropdown input) ===
$room_type_name = $property_type; 

// === GET OR CREATE ROOM TYPE (CRITICAL) ===
$room_type_name = $property_type; // Use the selected value for room type name
$room_type_id = null; // Ensure it starts as null

$stmt = $conn->prepare("SELECT room_type_id FROM room_types WHERE type_name = ?");
$stmt->bind_param('s', $room_type_name);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    $room_type_id = $row['room_type_id'];
    $stmt->close();
} else {
    $stmt->close();
    // Create new room type
    $stmt_insert = $conn->prepare("INSERT INTO room_types (type_name, description) VALUES (?, ?)");
    $desc = ucfirst($room_type_name) . " property";
    $stmt_insert->bind_param('ss', $room_type_name, $desc);
    $stmt_insert->execute();
    $room_type_id = $conn->insert_id;
    $stmt_insert->close();
}
// Final check
if ($room_type_id === null) {
    echo json_encode(['success' => false, 'error' => 'Failed to determine room type ID.']);
    exit;
}


// === START TRANSACTION ===
$conn->autocommit(false);

try {
    // === INSERT PROPERTY (Uses determined room_type_id) ===
    $address = $location;
    $stmt = $conn->prepare("
        INSERT INTO properties 
        (landlord_id, title, description, address, price, status, property_type, amenities, images, room_type_id, latitude, longitude) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    // Signature: 'isssdssssidd' 
    $stmt->bind_param(
        'isssdssssidd',
        $landlord_id,
        $title,
        $description,
        $address,
        $price,
        $db_status,
        $property_type,
        $amenities,
        $photosJson,
        $room_type_id, 
        $latitude,      // NEW
        $longitude      // NEW
    );
    $stmt->execute();
    $property_id = $conn->insert_id;
    $stmt->close();

    // === INSERT ROOM ===
    $room_number = "1";
    $rent_amount = $price;

    $stmt = $conn->prepare("
        INSERT INTO rooms 
        (property_id, room_type_id, room_number, rent_amount, bed_count, status) 
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param('iisdis', 
        $property_id, 
        $room_type_id,
        $room_number, 
        $rent_amount, 
        $bedrooms, 
        $db_status // <--- GAMITON ANG BAG-ONG DB STATUS
    );
    $stmt->execute();
    $stmt->close();

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Property added successfully!',
        'property_id' => $property_id,
        'photos' => $photos // ← relative paths
    ]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("add_property.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Failed to save property. Please try again. (' . $e->getMessage() . ')']);
} finally {
    $conn->autocommit(true);
    $conn->close();
}
?>