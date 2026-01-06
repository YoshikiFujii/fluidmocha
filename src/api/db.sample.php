<?php
header('Content-Type: application/json');
session_start();

class DB
{
    // 自身の環境に合わせて変更してください
    private $host = 'localhost';
    private $db_name = 'attendance_db';
    private $username = 'root';
    private $password = '';
    public $conn;

    public function connect()
    {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Connection Error: " . $e->getMessage()]);
            exit;
        }
        return $this->conn;
    }
}
