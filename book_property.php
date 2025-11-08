<?php
session_start();
header('Content-Type: application/json');
require 'connect.php'; 

// 1. Check kung naka-login ba ang tenant
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'tenant') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized. Please log in as a tenant.']);
    exit;
}

// 2. Kuhaon ang data gikan sa JavaScript
$data = json_decode(file_get_contents('php://input'), true);
$tenant_id = (int)$_SESSION['user_id'];
$tenant_name = $_SESSION['fullname'] ?? 'A tenant';
$property_id = (int)($data['property_id'] ?? 0);
$landlord_id = (int)($data['landlord_id'] ?? 0);
$property_title = trim($data['property_title'] ?? 'a property');
$booking_date = date('Y-m-d'); 

if ($property_id <= 0 || $landlord_id <= 0) {
    echo json_encode(['success' => false, 'error' => 'Invalid property or landlord ID.']);
    exit;
}

// ===============================================================
// === KRITIKAL NGA FIX: I-CHECK KUNG NAKA-BOOK NA BA ANG TENANT
// ===============================================================
$stmt_check = $conn->prepare(
    "SELECT status FROM bookings 
     WHERE tenant_id = ? AND property_id = ? AND (status = 'pending' OR status = 'confirmed')"
);
$stmt_check->bind_param('ii', $tenant_id, $property_id);
$stmt_check->execute();
$result_check = $stmt_check->get_result();

if ($result_check->num_rows > 0) {
    $existing_status = $result_check->fetch_assoc()['status'];
    $stmt_check->close();
    
    $error_msg = "You have already booked this property. Status: " . ucfirst($existing_status);
    echo json_encode(['success' => false, 'error' => $error_msg]);
    exit;
}
$stmt_check->close();
// ===============================================================

// 3. Magsugod ta ug Transaction
$conn->begin_transaction();

try {
    // 3a. I-save ang booking sa 'bookings' table
    $stmt_book = $conn->prepare(
        "INSERT INTO bookings (tenant_id, landlord_id, property_id, booking_date, status)
         VALUES (?, ?, ?, ?, 'pending')"
    );
    $stmt_book->bind_param('iiis', $tenant_id, $landlord_id, $property_id, $booking_date);
    $stmt_book->execute();
    $stmt_book->close();

    // 3b. Maghimo ug notification para sa LANDLORD
    $notif_title = "New Booking Request";
    $notif_desc = "$tenant_name requested to book your property: $property_title.";
    
    $stmt_notif = $conn->prepare(
        "INSERT INTO notifications (user_id, role, title, description, type)
         VALUES (?, 'landlord', ?, ?, 'booking')"
    );
    $stmt_notif->bind_param('iss', $landlord_id, $notif_title, $notif_desc);
    $stmt_notif->execute();
    $stmt_notif->close();

    // 4. I-commit ang duha ka queries
    $conn->commit();
    
    $conn->close();

    echo json_encode([
        'success' => true,
        'message' => 'Booking request sent successfully! Please wait for the landlord to confirm.'
    ]);

} catch (Exception $e) {
    $conn->rollback(); 
    error_log("book_property.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error: Could not process booking.']);
    exit;
}
?>