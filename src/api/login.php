<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->username) || !isset($data->password)) {
    echo json_encode(['status' => 'error', 'message' => 'Missing credentials']);
    exit;
}

$database = new DB();
$db = $database->connect();

$stmt = $db->prepare("SELECT id, username, password_hash, redirect_page FROM admins WHERE username = :username");
$stmt->bindParam(':username', $data->username);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (password_verify($data->password, $row['password_hash'])) {
        $_SESSION['admin_id'] = $row['id'];
        $_SESSION['admin_username'] = $row['username'];

        // Use redirect_page from DB, fallback to dashboard.html
        $redirect = !empty($row['redirect_page']) ? $row['redirect_page'] : 'dashboard.html';

        echo json_encode(['status' => 'success', 'message' => 'Login successful', 'redirect' => $redirect]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid password']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'User not found']);
}
