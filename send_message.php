<?php
// --- I-DUGANG NI PARA MAKITA ANG ERROR SA CONSOLE ---
ini_set('display_errors', 1);
error_reporting(E_ALL);
// ----------------------------------------------------

session_start();
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require 'connect.php'; 

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(["success" => false, "error" => "Invalid request method"]);
        exit;
    }

    // Kuhaon ang data gikan sa form
    $target_landlord_id = (int)($_POST['landlord_id'] ?? 0);
    $target_tenant_id   = (int)($_POST['tenant_id'] ?? 0);
    $property_id        = (int)($_POST['property_id'] ?? 0);
    $message_text       = trim($_POST['message'] ?? '');
    $subject            = trim($_POST['subject'] ?? 'General Inquiry');
    $sent_by_role       = trim($_POST['sent_by'] ?? ''); 
    $name               = trim($_POST['your_name'] ?? $_SESSION['fullname'] ?? 'A User');
    $email              = trim($_POST['your_email'] ?? $_SESSION['email'] ?? '');

    // --- 1. Validation ---
    if (!$target_landlord_id || !$target_tenant_id || !$message_text || !$sent_by_role) {
        echo json_encode(["success" => false, "error" => "Missing core required fields"]);
        exit;
    }

    // --- 2. Determine Message Content ---
    $db_message = "";
    $notif_recipient_id = 0;
    $notif_role = "";
    
    if ($sent_by_role === 'tenant') {
        // Tenant nag-send (message sa landlord).
        $db_message = "You: " . $message_text; 
        $notif_recipient_id = $target_landlord_id; 
        $notif_role = "landlord";
        
    } else if ($sent_by_role === 'landlord') {
        // Landlord nag-send (reply sa tenant).
        $db_message = $message_text; 
        $notif_recipient_id = $target_tenant_id; 
        $notif_role = "tenant";
        
    } else {
        echo json_encode(["success" => false, "error" => "Invalid sender role"]);
        exit;
    }
    
    $sent_at = date('Y-m-d H:i:s');
    
    $conn->begin_transaction();

    try {
        // 3. I-save sa 'messages' table (Foreign Key Fix: gamiton ang target_landlord_id ug target_tenant_id)
        $stmt_msg = $conn->prepare(
            "INSERT INTO messages (landlord_id, receiver_id, message_text, sent_at, is_read)
             VALUES (?, ?, ?, ?, 0)"
        );
        // INSERT: Landlord ID, Tenant ID, Message, Time
        $stmt_msg->bind_param('iiss', $target_landlord_id, $target_tenant_id, $db_message, $sent_at);
        $stmt_msg->execute();
        $stmt_msg->close();

        // 4. I-save sa 'inquiries' table (Kon gikan sa tenant)
        if ($sent_by_role === 'tenant' && $property_id > 0) {
            $stmt_inq = $conn->prepare(
                "INSERT INTO inquiries (tenant_id, landlord_id, property_id, subject, message, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)"
            );
            $stmt_inq->bind_param('iiisss', $target_tenant_id, $target_landlord_id, $property_id, $subject, $message_text, $sent_at);
            $stmt_inq->execute();
            $stmt_inq->close();
        }
        
        // 5. I-NOTIFY ang recipient (CRITICAL FIX FOR LANDLORD NOTIFS)
        if ($notif_role === 'landlord') {
            // Tenant to Landlord
            $notif_title = "New Inquiry/Message";
            $notif_desc = "$name sent you a new message.";
            
        } else {
            // Landlord to Tenant
            $notif_title = "New Reply";
            $notif_desc = "Landlord replied to your inquiry.";
        }
        
        $stmt_notif = $conn->prepare(
            "INSERT INTO notifications (user_id, role, title, description, type)
             VALUES (?, ?, ?, ?, 'message')"
        );
        // INSERT: user_id (landlord ID or tenant ID), role (landlord or tenant), title, description
        $stmt_notif->bind_param('isss', $notif_recipient_id, $notif_role, $notif_title, $notif_desc);
        $stmt_notif->execute();
        $stmt_notif->close();
        
        $conn->commit();

        echo json_encode([
            "success" => true,
            "message" => "Message sent successfully"
        ]);

    } catch (Exception $e) {
        $conn->rollback(); 
        error_log("send_message.php error: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => 'Transaction Failed: ' . $e->getMessage()]);
        exit;
    }

} catch (Exception $e) {
    error_log("send_message.php global error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "error" => "Server error: " . $e->getMessage()
    ]);
    exit;
}
?>  