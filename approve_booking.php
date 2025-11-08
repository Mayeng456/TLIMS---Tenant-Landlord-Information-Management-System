<?php
session_start();
header('Content-Type: application/json');
require 'connect.php'; 

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'landlord') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$landlord_id = (int)$_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);
$booking_id = (int)($data['booking_id'] ?? 0);

if ($booking_id <= 0) {
    echo json_encode(['success' => false, 'error' => 'Invalid Booking ID']);
    exit;
}

$conn->begin_transaction();
try {
    // 1. I-update ang booking status
    $stmt = $conn->prepare(
        "UPDATE bookings SET status = 'confirmed' 
         WHERE booking_id = ? AND landlord_id = ? AND status = 'pending'"
    );
    $stmt->bind_param('ii', $booking_id, $landlord_id);
    $stmt->execute();
    $affected_rows = $stmt->affected_rows;
    $stmt->close();

    if ($affected_rows == 0) {
        throw new Exception('Booking not found, not pending, or not owned by you.');
    }

    // 2. Maghimo ug notification para sa TENANT
    // Kuhaon daan ang details
    $stmt_details = $conn->prepare(
        "SELECT b.tenant_id, p.title 
         FROM bookings b
         JOIN properties p ON b.property_id = p.property_id
         WHERE b.booking_id = ?"
    );
    $stmt_details->bind_param('i', $booking_id);
    $stmt_details->execute();
    $details = $stmt_details->get_result()->fetch_assoc();
    $tenant_id = $details['tenant_id'];
    $property_title = $details['title'];
    $stmt_details->close();
    
    $notif_title = "Booking Confirmed!";
    $notif_desc = "Your booking request for '$property_title' has been confirmed by the landlord.";
    
    $stmt_notif = $conn->prepare(
        "INSERT INTO notifications (user_id, role, title, description, type)
         VALUES (?, 'tenant', ?, ?, 'booking')"
    );
    $stmt_notif->bind_param('iss', $tenant_id, $notif_title, $notif_desc);
    $stmt_notif->execute();
    $stmt_notif->close();

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Booking confirmed!']);

} catch (Exception $e) {
    $conn->rollback();
    error_log("approve_booking.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
?>