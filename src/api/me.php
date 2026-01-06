<?php
header('Content-Type: application/json');
require_once 'db.php';

if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$database = new DB();
$db = $database->connect();

try {
    $stmt = $db->prepare("SELECT id, username, redirect_page, assigned_gender, assigned_floor FROM admins WHERE id = :id");
    $stmt->execute([':id' => $_SESSION['admin_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        echo json_encode(['status' => 'success', 'user' => $user]);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'User not found']);
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>