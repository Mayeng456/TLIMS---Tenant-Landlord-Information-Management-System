<?php
// login.php
include('connect.php');
session_start();
ob_start(); // Prevent header errors

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($email) || empty($password)) {
        echo "<script>alert('Email and password required.'); history.back();</script>";
        exit;
    }

    // 1. Find user by email
    $stmt = $conn->prepare("
        SELECT user_id, fullname, password, role 
        FROM users 
        WHERE email = ?
    ");

    if (!$stmt) {
        echo "<script>alert('Database error.'); history.back();</script>";
        exit;
    }

    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows !== 1) {
        $stmt->close();
        echo "<script>alert('No account found.'); history.back();</script>";
        exit;
    }

    $user = $result->fetch_assoc();
    $stmt->close();

    // 2. Verify password
    if (!password_verify($password, $user['password'])) {
        echo "<script>alert('Incorrect password.'); history.back();</script>";
        exit;
    }

    // 3. Set session – FORCE lowercase role
    $_SESSION['user_id']  = $user['user_id'];
    $_SESSION['fullname'] = $user['fullname'];
    $_SESSION['role']     = strtolower(trim($user['role'])); // 'tenant' or 'landlord'

    // 4. Close DB and clear buffer
    $conn->close();
    ob_end_clean(); // CRITICAL: Clear any output before header()

    // 5. Redirect based on role
    if ($_SESSION['role'] === 'tenant') {
        header("Location: tenant.php");
    } elseif ($_SESSION['role'] === 'landlord') {
        header("Location: landlord.php");
    } else {
        header("Location: dashboard.php");
    }
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TLIMS – Login</title>
  <link rel="stylesheet" href="Login.css">
</head>
<body>
  <div class="container">
    <button class="close-btn" onclick="window.location.href='homepage.html'">X</button>

    <div class="header">
      <h1>TLIMS</h1>
      <p>Tenant-Landlord Information Management System</p>
    </div>

    <div class="tab">
      <button id="signInTab" class="active" onclick="showForm('signinForm')">Sign In</button>
      <button id="signUpTab" onclick="showForm('signupForm')">Sign Up</button>
    </div>

    <!-- SIGN IN FORM -->
    <form id="signinForm" action="login.php" method="POST" class="form">
      <h2>Welcome Back</h2>
      <p class="subtext">Sign in to access your account</p>

      <div class="input-group">
        <input type="email" name="email" placeholder="Email" required>
      </div>
      <div class="input-group">
        <input type="password" name="password" id="signinPassword" placeholder="Password" required>
        <i onclick="togglePassword('signinPassword')" title="Show Password">👁</i>
      </div>

      <button class="signin-btn" type="submit">Sign In</button>
      <div class="forgot"><a href="#">Forgot Password?</a></div>

      <div class="demo-box">
        <strong>Demo:</strong><br>
        Student: john@student.edu / 12345<br>
        Landlord: sarah@landlord.com / 12345
      </div>
    </form>

    <!-- SIGN UP FORM -->
    <form id="signupForm" action="register.php" method="POST" class="form" style="display:none;" onsubmit="return validateSignup()">
      <h2>Create Account</h2>
      <div class="input-group">
        <input type="text" name="fullname" placeholder="Full Name" required>
      </div>
      <div class="input-group">
        <input type="email" name="email" id="email" placeholder="Email" required>
      </div>
      <div class="input-group">
        <input type="password" name="password" id="password" placeholder="Password" required>
        <i onclick="togglePassword('password')">👁</i>
      </div>
      <div class="input-group">
        <input type="password" name="confirmPassword" id="confirmPassword" placeholder="Confirm Password" required>
        <i onclick="togglePassword('confirmPassword')">👁</i>
      </div>
      <div class="input-group">
        <select name="accountType" required>
          <option value="tenant">Student (Tenant)</option>
          <option value="landlord">Landlord</option>
        </select>
      </div>
      <button class="create-btn" type="submit">Create Account</button>
    </form>
  </div>

  <script>
    function showForm(id) {
      document.getElementById('signinForm').style.display = 'none';
      document.getElementById('signupForm').style.display = 'none';
      document.getElementById(id).style.display = 'block';
      document.getElementById('signInTab').classList.toggle('active', id === 'signinForm');
      document.getElementById('signUpTab').classList.toggle('active', id === 'signupForm');
    }

    function togglePassword(id) {
      const f = document.getElementById(id);
      f.type = f.type === 'password' ? 'text' : 'password';
    }

    function validateSignup() {
      const email = document.getElementById('email').value;
      const pass = document.getElementById('password').value;
      const confirm = document.getElementById('confirmPassword').value;
      if (!/^[^@]+@[^@]+\.[a-zA-Z]{2,}$/.test(email)) {
        alert("Invalid email"); return false;
      }
      if (pass.length < 6) {
        alert("Password too short"); return false;
      }
      if (pass !== confirm) {
        alert("Passwords don't match"); return false;
      }
      return true;
    }

    // Auto-open signup tab
    document.addEventListener("DOMContentLoaded", () => {
      if (location.search.includes('tab=signup')) showForm('signupForm');
    });
  </script>
</body>
</html>