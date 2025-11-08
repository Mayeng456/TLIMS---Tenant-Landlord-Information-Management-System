<?php
// register.php
include 'connect.php';               // $conn = new mysqli(...)

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // Only accept POST requests
    header("Location: register.html");
    exit;
}

// ---------- 1. Gather & clean input ----------
$fullname = trim($_POST['fullname'] ?? '');
$email    = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$confirm  = $_POST['confirmPassword'] ?? '';
$role     = strtolower(trim($_POST['accountType'] ?? ''));

// ---------- 2. Basic validation ----------
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo "<script>alert('Invalid email address.'); history.back();</script>";
    exit;
}
if ($password !== $confirm) {
    echo "<script>alert('Passwords do not match!'); history.back();</script>";
    exit;
}
if (empty($fullname) || empty($role) || !in_array($role, ['tenant','landlord'])) {
    echo "<script>alert('All fields are required and role must be tenant or landlord.'); history.back();</script>";
    exit;
}

// ---------- 3. Hash password ----------
$hashedPass = password_hash($password, PASSWORD_DEFAULT);

// ---------- 4. Check if email already exists ----------
$check = $conn->prepare("SELECT user_id FROM users WHERE email = ?");
if ($check === false) {
    echo "<script>alert('DB error (prepare): " . addslashes($conn->error) . "'); history.back();</script>";
    exit;
}
$check->bind_param("s", $email);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    echo "<script>alert('Email already registered. Please log in.'); window.location='login.php';</script>";
    $check->close();
    exit;
}
$check->close();

// ---------- 5. INSERT new user ----------
$stmt = $conn->prepare(
    "INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)"
);
if ($stmt === false) {
    echo "<script>alert('DB error (prepare): " . addslashes($conn->error) . "'); history.back();</script>";
    exit;
}
$stmt->bind_param("ssss", $fullname, $email, $hashedPass, $role);

if ($stmt->execute()) {
    $newUserId = $conn->insert_id;

    // ---- Insert into the correct role table (landlord / tenant) ----
    if ($role === 'landlord') {
        $land = $conn->prepare("INSERT INTO landlords (landlord_id, full_name) VALUES (?, ?)");
        $land->bind_param("is", $newUserId, $fullname);
        $land->execute();
        $land->close();
    } else { // tenant
        $ten = $conn->prepare("INSERT INTO tenants (id, name) VALUES (?, ?)");
        $ten->bind_param("is", $newUserId, $fullname);
        $ten->execute();
        $ten->close();
    }

    echo "<script>
            alert('Account created successfully! You can now sign in.');
            window.location='login.php';
          </script>";
} else {
    echo "<script>
            alert('Registration failed. Please try again.');
            history.back();
          </script>";
    error_log("Register insert error: " . $stmt->error);
}
$stmt->close();
$conn->close();

$stmt = $conn->prepare(
    "INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)"
);
// ...
if ($stmt->execute()) {
    $newUserId = $conn->insert_id; // Kuhaon ang bag-o nga ID (e.g., '8')

    if ($role === 'landlord') {
    // Kung landlord, automatic niya i-insert sa 'landlords' table
    $land = $conn->prepare("INSERT INTO landlords (landlord_id, full_name) VALUES (?, ?)");
    $land->bind_param("is", $newUserId, $fullname);
    $land->execute();
    $land->close();
} else { // tenant
    // Kung tenant, automatic niya i-insert sa 'tenants' table
    $ten = $conn->prepare("INSERT INTO tenants (id, name) VALUES (?, ?)");
    $ten->bind_param("is", $newUserId, $fullname);
    $ten->execute();
    $ten->close();
}
}
$stmt->close();
$conn->close();
?>