<?php
session_start();
header('Content-Type: application/json');
require 'connect.php'; // Gamiton ang imong standard mysqli connection

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'landlord') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Kuhaon ang data gikan sa JSON input (gikan sa landlord.js)
$data = json_decode(file_get_contents('php://input'), true);
$property_id = (int)($data['property_id'] ?? 0);
$landlord_id = (int)$_SESSION['user_id'];

if ($property_id <= 0) {
    echo json_encode(['success' => false, 'error' => 'Missing or Invalid Property ID']);
    exit;
}

// Magsugod ta ug Transaction para i-delete ang Rooms ug Property
$conn->begin_transaction();

try {
    // 1. I-verify ang ownership (Importante kaayo)
    $check_stmt = $conn->prepare("
        SELECT property_id FROM properties 
        WHERE property_id = ? AND landlord_id = ?
    ");
    $check_stmt->bind_param('ii', $property_id, $landlord_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    
    if ($result->num_rows === 0) {
        $check_stmt->close();
        throw new Exception('Property not found or not owned by you.');
    }
    $check_stmt->close();
    
    // 2. I-delete ang Rooms (Child records)
    $stmt_rooms = $conn->prepare("DELETE FROM rooms WHERE property_id = ?");
    $stmt_rooms->bind_param('i', $property_id);
    $stmt_rooms->execute();
    $stmt_rooms->close();

    // 3. I-delete ang Property (Parent record)
    $stmt_prop = $conn->prepare("DELETE FROM properties WHERE property_id = ? AND landlord_id = ?");
    $stmt_prop->bind_param('ii', $property_id, $landlord_id);
    $stmt_prop->execute();
    
    if ($stmt_prop->affected_rows > 0) {
        $conn->commit();
        $stmt_prop->close();
        echo json_encode(['success' => true, 'message' => 'Property deleted successfully']);
    } else {
        $stmt_prop->close();
        throw new Exception('Failed to delete property. Database operation error.');
    }
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("delete_property.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Failed to delete property: ' . $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>