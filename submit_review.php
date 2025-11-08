<?php
session_start();
header('Content-Type: application/json');
require 'connect.php'; 

// 1. Check Auth (Must be a logged-in tenant)
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'tenant') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized. Must be logged in as a tenant.']);
    exit;
}

$tenant_id = (int)$_SESSION['user_id'];

// 2. Get Input Data (JSON format from JS fetch request)
$data = json_decode(file_get_contents('php://input'), true);
$property_id = (int)($data['property_id'] ?? 0);
$rating = (int)($data['rating'] ?? 0);
$comment = trim($data['comment'] ?? '');

// 3. Validation
if ($property_id <= 0 || $rating < 1 || $rating > 5 || empty($comment)) {
    echo json_encode(['success' => false, 'error' => 'Invalid property, rating (1-5), or comment missing.']);
    exit;
}

try {
    // 4. Check if the tenant has already submitted a review for this property
    $check_stmt = $conn->prepare("
        SELECT review_id FROM reviews 
        WHERE tenant_id = ? AND property_id = ?
    ");
    $check_stmt->bind_param('ii', $tenant_id, $property_id);
    $check_stmt->execute();
    if ($check_stmt->get_result()->num_rows > 0) {
        $check_stmt->close();
        echo json_encode(['success' => false, 'error' => 'You have already reviewed this property.']);
        exit;
    }
    $check_stmt->close();
    
    // 5. Insert the new review
    $stmt = $conn->prepare(
        "INSERT INTO reviews (tenant_id, property_id, rating, comment)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param('iiis', $tenant_id, $property_id, $rating, $comment);
    $stmt->execute();
    $stmt->close();
    $conn->close();

    echo json_encode([
        'success' => true,
        'message' => 'Review submitted successfully!',
        'review_id' => $conn->insert_id
    ]);

} catch (Exception $e) {
    error_log("submit_review.php error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error: Could not process review.']);
    exit;
}
?>