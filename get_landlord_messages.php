<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require 'connect.php'; // Siguradua nga naa ni nga file

try {
    // 1. Check kung naka-login ba ang landlord
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'landlord') {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit;
    }

    $landlord_id = (int)$_SESSION['user_id'];

    // 2. Kuhaon ang tanan messages para aning landlord
    $stmt = $conn->prepare("
        SELECT 
            m.id, 
            m.landlord_id, 
            m.receiver_id, -- Kini ang tenant_id
            m.message_text, 
            m.sent_at, 
            m.is_read,
            COALESCE(t.name, 'Unknown Tenant') AS tenant_name,
            
            -- Subquery para makuha ang property title gikan sa pinaka-ulahing booking/inquiry
            (
                SELECT p.title FROM bookings b
                JOIN properties p ON b.property_id = p.property_id
                WHERE b.tenant_id = m.receiver_id AND b.landlord_id = m.landlord_id
                ORDER BY b.created_at DESC
                LIMIT 1
            ) AS property_title
            
        FROM messages m
        LEFT JOIN tenants t ON m.receiver_id = t.id -- I-JOIN sa tenants table
        WHERE m.landlord_id = ?
        ORDER BY m.sent_at ASC
    ");
    $stmt->bind_param('i', $landlord_id);
    $stmt->execute();
    $messages = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    $conn->close();

    // 3. Return ang data
    echo json_encode([
        "success" => true,
        "messages" => $messages
    ]);

} catch (Exception $e) {
    error_log("get_landlord_messages.php error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "error" => "Server error: Unable to process request"
    ]);
    exit;
}
?>