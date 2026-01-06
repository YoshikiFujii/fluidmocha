<?php
header('Content-Type: application/json');
require_once 'db.php';

// Ensure user is logged in
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$database = new DB();
$db = $database->connect();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // List users
        try {
            $stmt = $db->prepare("SELECT id, username, redirect_page, assigned_gender, assigned_floor, created_at FROM admins ORDER BY id ASC");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'users' => $users]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'POST':
        // Create user
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->username) || !isset($data->password)) {
            echo json_encode(['status' => 'error', 'message' => 'Missing username or password']);
            exit;
        }

        try {
            $stmt = $db->prepare("INSERT INTO admins (username, password_hash, redirect_page, assigned_gender, assigned_floor) VALUES (:username, :password_hash, :redirect, :gender, :floor)");
            $stmt->execute([
                ':username' => $data->username,
                ':password_hash' => password_hash($data->password, PASSWORD_DEFAULT),
                ':redirect' => isset($data->redirect_page) ? $data->redirect_page : 'dashboard.html',
                ':gender' => isset($data->assigned_gender) ? $data->assigned_gender : null,
                ':floor' => isset($data->assigned_floor) ? $data->assigned_floor : null
            ]);
            echo json_encode(['status' => 'success', 'message' => 'User created']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        // Update user
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->id)) {
            echo json_encode(['status' => 'error', 'message' => 'Missing User ID']);
            exit;
        }

        try {
            // Build query dynamically based on whether password is provided
            $sql = "UPDATE admins SET username = :username, redirect_page = :redirect, assigned_gender = :gender, assigned_floor = :floor";
            $params = [
                ':username' => $data->username,
                ':redirect' => isset($data->redirect_page) ? $data->redirect_page : 'dashboard.html',
                ':gender' => isset($data->assigned_gender) ? $data->assigned_gender : null,
                ':floor' => isset($data->assigned_floor) ? $data->assigned_floor : null,
                ':id' => $data->id
            ];

            if (!empty($data->password)) {
                $sql .= ", password_hash = :password_hash";
                $params[':password_hash'] = password_hash($data->password, PASSWORD_DEFAULT);
            }

            $sql .= " WHERE id = :id";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['status' => 'success', 'message' => 'User updated']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        // Delete user
        if (!isset($_GET['id'])) {
            echo json_encode(['status' => 'error', 'message' => 'Missing ID']);
            exit;
        }

        // Prevent deleting self? Optional but good practice.
        if ($_GET['id'] == $_SESSION['admin_id']) {
            echo json_encode(['status' => 'error', 'message' => 'Cannot delete yourself']);
            exit;
        }

        try {
            $stmt = $db->prepare("DELETE FROM admins WHERE id = :id");
            $stmt->execute([':id' => $_GET['id']]);
            echo json_encode(['status' => 'success', 'message' => 'User deleted']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
        break;
}
?>