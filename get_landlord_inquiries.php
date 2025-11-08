<?php
// --- I-force ang error reporting ---
ini_set('display_errors', 1);
error_reporting(E_ALL);
// ----------------------------------

session_start();
header('Content-Type: application/json');
require 'connect.php'; 

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'landlord') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$landlord_id = (int)$_SESSION['user_id'];

try {
    // --- GI-AYO NGA QUERY ---
    // Gigamit na ang LEFT JOIN para mogawas gihapon ang booking
    // bisan kung na-delete na ang property or tenant.
    $stmt = $conn->prepare("
        SELECT 
            b.booking_id, 
            b.status, 
            b.created_at,
            COALESCE(t.name, 'Deleted Tenant') AS tenant_name,
            COALESCE(p.title, 'Deleted Property') AS property_title
        FROM bookings b
        LEFT JOIN tenants t ON b.tenant_id = t.id
        LEFT JOIN properties p ON b.property_id = p.property_id
        WHERE b.landlord_id = ?
        ORDER BY b.created_at DESC
    ");
    $stmt->bind_param('i', $landlord_id);
    $stmt->execute();
    $bookings = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    $conn->close();

    echo json_encode([
        'success' => true,
        'bookings' => $bookings
    ]);

} catch (Exception $e) {
    error_log("get_landlord_inquiries.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
?>