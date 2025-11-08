<?php
session_start();
header('Content-Type: application/json');
require 'connect.php'; // Siguradua nga naa ni nga file

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'tenant') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$tenant_id = (int)$_SESSION['user_id'];
$summary = [
    'active_bookings' => 0,
    'pending_inquiries' => 0,
    'total_properties' => 0,
    'recent_activity' => []
];

try {
    // 1. Kuhaon ang count sa Active Bookings
    $stmt_bookings = $conn->prepare(
        "SELECT COUNT(*) as count FROM bookings 
         WHERE tenant_id = ? AND status = 'confirmed'"
    );
    $stmt_bookings->bind_param('i', $tenant_id);
    $stmt_bookings->execute();
    $summary['active_bookings'] = $stmt_bookings->get_result()->fetch_assoc()['count'] ?? 0;
    $stmt_bookings->close();

    // 2. Kuhaon ang count sa Pending Inquiries
    $stmt_inquiries = $conn->prepare(
        "SELECT COUNT(*) as count FROM inquiries 
         WHERE tenant_id = ? AND status = 'pending'"
    );
    $stmt_inquiries->bind_param('i', $tenant_id);
    $stmt_inquiries->execute();
    $summary['pending_inquiries'] = $stmt_inquiries->get_result()->fetch_assoc()['count'] ?? 0;
    $stmt_inquiries->close();

    // 3. Kuhaon ang count sa Total Available Properties
    $stmt_props = $conn->prepare("SELECT COUNT(*) as count FROM properties WHERE status = 'available'");
    $stmt_props->execute();
    $summary['total_properties'] = $stmt_props->get_result()->fetch_assoc()['count'] ?? 0;
    $stmt_props->close();

    // 4. Kuhaon ang Recent Activity (gikan sa notifications)
    $stmt_activity = $conn->prepare(
        "SELECT title, description, created_at, type 
         FROM notifications 
         WHERE user_id = ? AND role = 'tenant' 
         ORDER BY created_at DESC 
         LIMIT 3" // Kuhaon ang top 3
    );
    $stmt_activity->bind_param('i', $tenant_id);
    $stmt_activity->execute();
    $summary['recent_activity'] = $stmt_activity->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_activity->close();
    
    $conn->close();

    echo json_encode(['success' => true, 'summary' => $summary]);

} catch (Exception $e) {
    error_log("get_tenant_summary.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error']);
}
?>