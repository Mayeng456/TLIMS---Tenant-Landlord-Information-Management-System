<?php
session_start();
header('Content-Type: application/json');
require 'connect.php'; // Siguradua nga sakto ang path sa imong connect.php

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'tenant') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Kuhaon ang data gikan sa JavaScript
$data = json_decode(file_get_contents('php://input'), true);
$user_id = (int)$_SESSION['user_id'];
$property_id = (int)($data['property_id'] ?? 0);

if ($property_id <= 0) {
    echo json_encode(['success' => false, 'error' => 'Invalid Property ID']);
    exit;
}

// 1. Check kung gi-like na ba
$stmt = $conn->prepare("SELECT favorite_id FROM user_favorites WHERE user_id = ? AND property_id = ?");
$stmt->bind_param('ii', $user_id, $property_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // 2a. Kung naa na (Gi-like na), i-DELETE (unlike)
    $stmt_delete = $conn->prepare("DELETE FROM user_favorites WHERE user_id = ? AND property_id = ?");
    $stmt_delete->bind_param('ii', $user_id, $property_id);
    $stmt_delete->execute();
    $stmt_delete->close();
    echo json_encode(['success' => true, 'action' => 'removed', 'property_id' => $property_id]);
} else {
    // 2b. Kung wala pa, i-INSERT (like)
    $stmt_insert = $conn->prepare("INSERT INTO user_favorites (user_id, property_id) VALUES (?, ?)");
    $stmt_insert->bind_param('ii', $user_id, $property_id);
    $stmt_insert->execute();
    $stmt_insert->close();
    echo json_encode(['success' => true, 'action' => 'added', 'property_id' => $property_id]);
}

$stmt->close();
$conn->close();
?>