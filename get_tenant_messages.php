<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require 'connect.php'; 

try {
    $tenant_id = isset($_GET['tenant_id']) ? intval($_GET['tenant_id']) : null;
    
    // Kon walay tenant_id, kuhaon kini gikan sa session (mas luwas)
    if (!$tenant_id && isset($_SESSION['user_id']) && $_SESSION['role'] === 'tenant') {
        $tenant_id = (int)$_SESSION['user_id'];
    }

    if (!$tenant_id) {
        echo json_encode(["success" => false, "error" => "Unauthorized or Missing tenant_id parameter"]);
        exit;
    }

    // --- 1. Kuhaon ang tanan messages (para sa chat window) ug Landlord Name ---
    $stmt = $conn->prepare("
        SELECT 
            m.id, 
            m.landlord_id, 
            m.receiver_id, 
            m.message_text, 
            m.sent_at, 
            m.is_read,
            COALESCE(l.full_name, 'Unknown Landlord') AS landlord_name,
            
            -- Subquery para makuha ang property title gikan sa pinaka-ulahing booking/inquiry
            (
                SELECT p.title FROM bookings b
                JOIN properties p ON b.property_id = p.property_id
                WHERE b.tenant_id = m.receiver_id AND b.landlord_id = m.landlord_id
                ORDER BY b.created_at DESC
                LIMIT 1
            ) AS property_title

        FROM messages m
        LEFT JOIN landlords l ON m.landlord_id = l.landlord_id
        WHERE m.receiver_id = ? 
        ORDER BY m.sent_at ASC
    ");
    $stmt->bind_param('i', $tenant_id); 
    $stmt->execute();
    $messages = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // --- 2. Kuhaon ang count sa unread messages ---
    // Kanang gikan sa landlord (dili nagsugod sa 'You: ') ug para sa tenant (receiver_id = tenant_id)
    $stmt_count = $conn->prepare("
        SELECT COUNT(id) as unread_count
        FROM messages
        WHERE receiver_id = ? AND is_read = 0 AND message_text NOT LIKE 'You: %'
    ");
    $stmt_count->bind_param('i', $tenant_id);
    $stmt_count->execute();
    $unread_count = $stmt_count->get_result()->fetch_assoc()['unread_count'] ?? 0;
    $stmt_count->close();
    
    $conn->close();

    echo json_encode([
        "success" => true,
        "messages" => $messages,
        "unread_count" => (int)$unread_count 
    ]);

} catch (Exception $e) {
    error_log("get_tenant_messages.php error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "error" => "Server error: Unable to process request"
    ]);
    exit;
}
?>