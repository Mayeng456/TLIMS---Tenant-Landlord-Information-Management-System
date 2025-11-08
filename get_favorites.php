<?php
session_start();
header('Content-Type: application/json');
require 'connect.php'; // Siguradua nga sakto ang path sa imong connect.php

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'tenant') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$user_id = (int)$_SESSION['user_id'];
$favorites = [];

$stmt = $conn->prepare("SELECT property_id FROM user_favorites WHERE user_id = ?");
$stmt->bind_param('i', $user_id);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $favorites[] = (int)$row['property_id'];
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'favorites' => $favorites]);
?>