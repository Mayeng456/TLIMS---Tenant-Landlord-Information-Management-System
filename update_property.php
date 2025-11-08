<?php
// FINAL/update_property.php - MODIFIED to accept and save LAT/LNG
ini_set('display_errors', 0); // Suppress error display to prevent JSON break
error_reporting(E_ALL); 
session_start();
header('Content-Type: application/json');

// Start output buffering to catch any premature output
ob_start();

try {
    /* --------------------------------------------------------------
       DATABASE CONNECTION
       -------------------------------------------------------------- */
    $conn = new mysqli('localhost', 'root', '', 'tlims_db');
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    /* --------------------------------------------------------------
       SESSION / AUTH
       -------------------------------------------------------------- */
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('User not logged in');
    }
    $landlord_id = (int)$_SESSION['user_id'];

    /* --------------------------------------------------------------
       INPUT
       -------------------------------------------------------------- */
    $property_id   = intval($_POST['property_id'] ?? 0);
    $title         = trim($_POST['prop-title'] ?? '');
    $location      = trim($_POST['prop-location'] ?? ''); 

    $property_type = strtolower(trim($_POST['prop-type'] ?? 'apartment')); 
    $bathrooms     = intval($_POST['prop-bathrooms'] ?? 1); 
    $bedrooms      = intval($_POST['prop-bedrooms'] ?? 0); 
    $price         = floatval($_POST['prop-price'] ?? 0);
    $description   = trim($_POST['prop-desc'] ?? '');
    $status_select = $_POST['prop-status'] ?? 'Available Now';   // UI value
    $amenities     = trim($_POST['amenities'] ?? '');

    // NEW: GET COORDINATES
    $latitude      = floatval($_POST['prop-lat'] ?? 0);
    $longitude     = floatval($_POST['prop-lng'] ?? 0);


    if ($property_id <= 0 || $title === '' || $location === '' || $bedrooms <= 0 || $price <= 0) {
        throw new Exception('Please fill all required fields: ID, Title, Location, Bedrooms, Price');
    }

    $db_status = 'available'; // Default value
    switch ($status_select) {
        case 'Available Now':
            $db_status = 'available';
            break;
        case 'Currently Occupied':
            $db_status = 'rented'; // <--- SAKTO NI
            break;
        case 'Coming Soon':
            $db_status = 'coming soon';
            break;
        case 'Maintenance': 
             $db_status = 'maintenance';
             break;
        default: 
            $db_status = 'available';
            break;
    }
    /* --------------------------------------------------------------
       OPTIONAL PHOTOS – keep existing, add new (max 3 total)
       -------------------------------------------------------------- */
    $photosJson = null;
    $allPhotos = [];

    $uploadDir = __DIR__ . '/uploads/properties/';
    $webPath   = 'uploads/properties/';

    if (isset($_FILES['prop-photos']) && is_array($_FILES['prop-photos']['name'])) {
        $files = $_FILES['prop-photos'];
        $total = count($files['name']);
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $maxFileSize = 5 * 1024 * 1024; // 5MB

        for ($i = 0; $i < $total && $i < 3; $i++) {
            if ($files['error'][$i] !== 0) continue;
            
            $tmpName = $files['tmp_name'][$i];
            $origName = $files['name'][$i];
            $size = $files['size'][$i];
            
            if ($size > $maxFileSize) continue; 
            
            // Check mime type safely (CRITICAL)
            if (function_exists('mime_content_type')) {
                 $mime = mime_content_type($tmpName);
            } else {
                 $mime = 'image/jpeg'; // Fallback
            }
            
            if (!in_array($mime, $allowedTypes)) continue;

            $ext = pathinfo($origName, PATHINFO_EXTENSION);
            $filename = 'prop_' . uniqid() . '.' . strtolower($ext);
            $filePath = $uploadDir . $filename;
            $webUrl   = $webPath . $filename;

            if (move_uploaded_file($tmpName, $filePath)) {
                $photos[] = $webUrl;
            }
        }
    }

    // Fetch existing photos if no new photos were uploaded (or to merge)
    if (empty($photos)) {
        $stmt_old = $conn->prepare("SELECT images FROM properties WHERE property_id = ?");
        $stmt_old->bind_param('i', $property_id);
        $stmt_old->execute();
        $result_old = $stmt_old->get_result()->fetch_assoc();
        $stmt_old->close();
        
        $existing_images = json_decode($result_old['images'], true);
        if (is_array($existing_images)) {
            $allPhotos = $existing_images;
        }
    } else {
        $allPhotos = $photos;
    }

    $photosJson = json_encode($allPhotos);

    /* --------------------------------------------------------------
       GET / CREATE ROOM TYPE 
       -------------------------------------------------------------- */
    $room_type_name = $property_type; 
    $room_type_id = null; 

    $stmt = $conn->prepare("SELECT room_type_id FROM room_types WHERE type_name = ?");
    $stmt->bind_param('s', $room_type_name);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        $room_type_id = $row['room_type_id'];
        $stmt->close();
    } else {
        $stmt->close();
        $stmt_insert = $conn->prepare("INSERT INTO room_types (type_name, description) VALUES (?, ?)");
        $desc = ucfirst($room_type_name) . " property";
        $stmt_insert->bind_param('ss', $room_type_name, $desc);
        $stmt_insert->execute();
        $room_type_id = $conn->insert_id;
        $stmt_insert->close();
    }

    /* --------------------------------------------------------------
       TRANSACTION – UPDATE PROPERTY + ROOM
       -------------------------------------------------------------- */
    $conn->begin_transaction();

    
    /* ---- UPDATE properties (FIX: I-apil ang latitude/longitude) ---- */
    $stmt = $conn->prepare("
        UPDATE properties
        SET title        = ?,
            description  = ?,
            address      = ?, 
            price        = ?,
            status       = ?,
            property_type= ?,
            amenities    = ?,
            images       = ?,
            room_type_id = ?,
            bathrooms    = ?,
            bedrooms     = ?,
            latitude     = ?,
            longitude    = ?
        WHERE property_id = ? AND landlord_id = ?
    ");
    $stmt->bind_param(
        // CRITICAL FIX: The signature must be 15 characters long to match the 15 placeholders.
        // sss d ssss i i i d d i i
        // 14 total args in set. 2 args in where. 14+2 = 16. WAIT. 13 args in set + 2 in where. Total 15.
        // It was missing the last 'i' for $landlord_id.
        'sssdssssiiiddii', 
        $title,
        $description,
        $location, 
        $price,
        $db_status,
        $property_type, 
        $amenities,
        $photosJson,
        $room_type_id,
        $bathrooms,
        $bedrooms,         
        $latitude,
        $longitude,
        $property_id, 
        $landlord_id 
    );
    
    $prop_update_success = $stmt->execute();
    
    if (!$prop_update_success) {
        throw new Exception('Database update failed for properties table: ' . $stmt->error);
    }
    
    $stmt->close();

    /* ---- UPDATE rooms (rooms table uses property_id) ---- */
    $stmt = $conn->prepare("
        UPDATE rooms
        SET rent_amount = ?, bed_count = ?, status = ?
        WHERE property_id = ?
    ");
    $stmt->bind_param('disi', $price, $bedrooms, $db_status, $property_id); 
    $stmt->execute();
    $stmt->close();

    $conn->commit();

    // Final Output
    ob_end_clean(); // I-discard ang tanan nga na-buffer
    echo json_encode([
        'success' => true,
        'message' => 'Property updated successfully (or no changes detected)',
        'property_id' => $property_id,
        'photos' => $allPhotos
    ]);

} catch (Exception $e) {
    if (isset($conn) && method_exists($conn, 'rollback')) {
        $conn->rollback();
    }
    ob_end_clean(); // I-discard ang buffer bisan sa sayop
    error_log("update_property.php error: " . $e->getMessage());
    // Ibalik ang error message sa JSON
    echo json_encode(['success' => false, 'error' => 'Server Error: ' . $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>