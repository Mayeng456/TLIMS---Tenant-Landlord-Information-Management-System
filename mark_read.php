<?php
session_start();
header('Content-Type: application/json');
require 'connect.php'; // Siguradua nga naa ni nga file

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$user_id = (int)$_SESSION['user_id'];
$role = $_SESSION['role'] ?? null;

// Kuhaon ang data gikan sa URL (GET)
$notification_id = (int)($_GET['id'] ?? 0);
$mark_all = (bool)($_GET['all'] ?? false);

// BAG-O: Parameters para sa Message Mark as Read (Gikan sa tenant.js)
$tenant_id_msg = (int)($_GET['tenant_id'] ?? 0);
$landlord_id_msg = (int)($_GET['landlord_id'] ?? 0);

if ($notification_id <= 0 && !$mark_all && ($tenant_id_msg <= 0 || $landlord_id_msg <= 0)) {
    echo json_encode(['success' => false, 'error' => 'No ID or chat specified']);
    exit;
}

try {
    if ($mark_all) {
        // Markahon tanan notifications
        $stmt = $conn->prepare(
            "UPDATE notifications SET is_read = 1 
             WHERE user_id = ? AND role = ? AND is_read = 0"
        );
        $stmt->bind_param('is', $user_id, $role);
    } 
    elseif ($notification_id > 0) {
        // Markahon ang usa lang ka notification
        $stmt = $conn->prepare(
            "UPDATE notifications SET is_read = 1 
             WHERE id = ? AND user_id = ? AND role = ?"
        );
        $stmt->bind_param('iis', $notification_id, $user_id, $role);
    }
    elseif ($tenant_id_msg > 0 && $landlord_id_msg > 0) {
        // FIX: Markahon ang TANANG UNREAD MESSAGES sa usa ka chat conversation
        // Kani mao'y gitawag sa tenant.js pag-klik sa conversation
        $stmt = $conn->prepare(
            "UPDATE messages SET is_read = 1 
             WHERE landlord_id = ? AND receiver_id = ? AND message_text NOT LIKE 'You: %' AND is_read = 0"
        );
        // Ang Landlord ang nagpadala (walay prefix) ug ang Tenant ang nagdawat
        $stmt->bind_param('ii', $landlord_id_msg, $tenant_id_msg);
    }
    else {
        echo json_encode(['success' => false, 'error' => 'Invalid parameters for read operation']);
        exit;
    }

    $stmt->execute();
    $affected_rows = $stmt->affected_rows;
    $stmt->close();
    $conn->close();

    echo json_encode(['success' => true, 'updated' => $affected_rows]);

} catch (Exception $e) {
    error_log("mark_read.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error']);
}
?>