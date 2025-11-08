<?php
session_start();
header('Content-Type: application/json');
require 'connect.php'; // Siguradua nga naa ni nga file

// 1. Check kung kinsa nga user ang naka-login
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$user_id = (int)$_SESSION['user_id'];
$role = $_SESSION['role'] ?? null; // 'tenant' or 'landlord'

// 2. Siguraduhon nga ang role kay sakto
if (!$role) {
     echo json_encode(['success' => false, 'error' => 'User role not found in session']);
    exit;
}

try {
    // 3. Kuhaon ang tanan notifications para aning user (base sa role)
    $stmt = $conn->prepare(
        "SELECT * FROM notifications 
         WHERE user_id = ? AND role = ? 
         ORDER BY created_at DESC 
         LIMIT 20"
    );
    $stmt->bind_param('is', $user_id, $role);
    $stmt->execute();
    $result = $stmt->get_result();
    $notifications = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // 4. Kuhaon ang count sa wala pa nabasa (unread)
    $stmt_count = $conn->prepare(
        "SELECT COUNT(*) as unread_count 
         FROM notifications 
         WHERE user_id = ? AND role = ? AND is_read = 0"
    );
    $stmt_count->bind_param('is', $user_id, $role);
    $stmt_count->execute();
    $unread_count = $stmt_count->get_result()->fetch_assoc()['unread_count'] ?? 0;
    $stmt_count->close();
    
    $conn->close();

    echo json_encode([
        'success' => true,
        'notifications' => $notifications,
        'unread_count' => (int)$unread_count
    ]);

} catch (Exception $e) {
    error_log("notifications.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error']);
}
?>