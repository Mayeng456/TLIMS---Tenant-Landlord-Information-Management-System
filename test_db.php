<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');
header("Content-Type: application/json");
try {
    $dsn = "mysql:host=localhost;dbname=tlims_db;charset=utf8mb4";
    $conn = new PDO($dsn, "root", "");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo json_encode(["success" => true, "message" => "Database connection successful"]);
} catch (PDOException $e) {
    error_log("Test DB error: " . $e->getMessage() . " | DSN: $dsn | Username: root");
    echo json_encode(["success" => false, "error" => "Database connection failed: Check php_errors.log"]);
}
?>