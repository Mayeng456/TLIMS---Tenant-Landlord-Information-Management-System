<?php
session_start();
header('Content-Type: application/json');
require 'connect.php'; 

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'landlord') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$landlord_id = (int)$_SESSION['user_id'];
$summary = [
    'total_properties' => 0,
    'available_properties' => 0,
    'occupied_properties' => 0,
    'occupancy_rate' => 0,
    'monthly_income' => 0, // DILI NA KINI GAMITON
    'pending_bookings' => 0,
    'total_tenants' => 0, 
    'new_messages' => 0,
    'recent_activity' => [],
    'new_tenants_month' => 0,
    'avg_rating' => 0.0,
    'response_rate' => 0,
    'todays_views' => 0
];

try {
    // 1. Property Stats (Gi-kuha ang SUM(price) part)
    $stmt_props = $conn->prepare(
        "SELECT 
            COUNT(*) as total_count,
            SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_count,
            SUM(CASE WHEN status = 'rented' THEN 1 ELSE 0 END) as occupied_count
         FROM properties 
         WHERE landlord_id = ?"
    );
    $stmt_props->bind_param('i', $landlord_id);
    $stmt_props->execute();
    $prop_data = $stmt_props->get_result()->fetch_assoc();
    $stmt_props->close();

    if ($prop_data) {
        $summary['total_properties'] = (int)$prop_data['total_count'];
        $summary['available_properties'] = (int)$prop_data['available_count'];
        $summary['occupied_properties'] = (int)$prop_data['occupied_count'];
        // $summary['monthly_income'] gikuha
        
        if ($summary['total_properties'] > 0) {
            $summary['occupancy_rate'] = round(($summary['occupied_properties'] / $summary['total_properties']) * 100);
        }
    }

    // 2. Pending Bookings
    $stmt_bookings = $conn->prepare(
        "SELECT COUNT(*) as count FROM bookings 
         WHERE landlord_id = ? AND status = 'pending'"
    );
    $stmt_bookings->bind_param('i', $landlord_id);
    $stmt_bookings->execute();
    $summary['pending_bookings'] = (int)$stmt_bookings->get_result()->fetch_assoc()['count'];
    $stmt_bookings->close();

    // 3. New Messages (gikan sa notifications)
    $stmt_msgs = $conn->prepare(
        "SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = ? AND role = 'landlord' AND type = 'message' AND is_read = 0"
    );
    $stmt_msgs->bind_param('i', $landlord_id);
    $stmt_msgs->execute();
    $summary['new_messages'] = (int)$stmt_msgs->get_result()->fetch_assoc()['count'];
    $stmt_msgs->close();

    // 4. Recent Activity (gikan sa notifications)
    $stmt_activity = $conn->prepare(
        "SELECT title, description, created_at, type, is_read 
         FROM notifications 
         WHERE user_id = ? AND role = 'landlord' 
         ORDER BY created_at DESC 
         LIMIT 4" 
    );
    $stmt_activity->bind_param('i', $landlord_id);
    $stmt_activity->execute();
    $summary['recent_activity'] = $stmt_activity->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_activity->close();
    
    // 5. Total Tenants 
    $stmt_tenants = $conn->prepare(
        "SELECT COUNT(DISTINCT tenant_id) as count 
         FROM bookings 
         WHERE landlord_id = ? AND status = 'confirmed'"
    );
    $stmt_tenants->bind_param('i', $landlord_id);
    $stmt_tenants->execute();
    $summary['total_tenants'] = (int)$stmt_tenants->get_result()->fetch_assoc()['count'];
    $stmt_tenants->close();
    
    // 6. New Tenants This Month 
    $current_month = date('m');
    $current_year = date('Y');

    $stmt_new_tenants = $conn->prepare(
        "SELECT COUNT(DISTINCT b.tenant_id) as count 
         FROM bookings b
         WHERE b.landlord_id = ? 
         AND b.status = 'confirmed'
         AND MONTH(b.created_at) = ?
         AND YEAR(b.created_at) = ?"
    );
    $stmt_new_tenants->bind_param('iii', $landlord_id, $current_month, $current_year);
    $stmt_new_tenants->execute();
    $summary['new_tenants_month'] = (int)$stmt_new_tenants->get_result()->fetch_assoc()['count'];
    $stmt_new_tenants->close();
    
    // 7. Add Static Performance Metrics 
    $summary['avg_rating'] = 4.8;
    $summary['response_rate'] = 95;
    $summary['todays_views'] = 12; 
    
    $conn->close();

    echo json_encode(['success' => true, 'summary' => $summary]);

} catch (Exception $e) {
    error_log("get_landlord_summary.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
?>