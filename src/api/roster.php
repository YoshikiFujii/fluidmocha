<?php
require_once 'db.php';
require '../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

function generateUUID()
{
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff)
    );
}

$database = new DB();
$db = $database->connect();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    // Check if it's an update (method spoofing) or actual create
    if (isset($_POST['_method']) && $_POST['_method'] === 'PUT') {
        $method = 'PUT';
    }
}

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            // Get specific roster details
            $stmt = $db->prepare("SELECT r.id, r.name, c.* FROM rosters r LEFT JOIN roster_config c ON r.id = c.roster_id WHERE r.id = :id");
            $stmt->bindParam(':id', $_GET['id']);
            $stmt->execute();
            $roster = $stmt->fetch(PDO::FETCH_ASSOC);

            // Fetch students
            if ($roster) {
                $stmtS = $db->prepare("SELECT * FROM students WHERE roster_id = :id ORDER BY room ASC");
                $stmtS->bindParam(':id', $_GET['id']);
                $stmtS->execute();
                $roster['students'] = $stmtS->fetchAll(PDO::FETCH_ASSOC);
            }

            echo json_encode($roster);
        } else {
            // List rosters
            $stmt = $db->query("SELECT r.id, r.name, r.created_at, (SELECT COUNT(*) FROM students WHERE roster_id = r.id) as student_count FROM rosters r ORDER BY r.created_at DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    case 'POST':
        // Upload and Create
        if (!isset($_FILES['file']) || !isset($_POST['name'])) {
            echo json_encode(['status' => 'error', 'message' => 'Missing file or name']);
            exit;
        }

        $name = $_POST['name'];
        $cols = [
            'col_room' => $_POST['col_room'] ?? null,
            'col_floor' => $_POST['col_floor'] ?? null,
            'col_gender' => $_POST['col_gender'] ?? null,
            'col_category' => $_POST['col_category'] ?? null,
            'col_name' => $_POST['col_name'] ?? null,
            'col_kana' => $_POST['col_kana'] ?? null,
            'col_hometown' => $_POST['col_hometown'] ?? null,
            'col_student_num' => $_POST['col_student_num'] ?? null,
            'col_department' => $_POST['col_department'] ?? null,
        ];

        $uploadDir = '../uploads/';
        if (!is_dir($uploadDir))
            mkdir($uploadDir, 0777, true);

        $fileName = uniqid() . '_' . basename($_FILES['file']['name']);
        $filePath = $uploadDir . $fileName;

        if (move_uploaded_file($_FILES['file']['tmp_name'], $filePath)) {
            try {
                $db->beginTransaction();

                // Insert Roster
                $stmt = $db->prepare("INSERT INTO rosters (name, file_name) VALUES (:name, :file_name)");
                $stmt->execute([':name' => $name, ':file_name' => $filePath]);
                $rosterId = $db->lastInsertId();

                // Insert Config
                $sqlConfig = "INSERT INTO roster_config (roster_id, col_room, col_floor, col_gender, col_category, col_name, col_kana, col_hometown, col_student_num, col_department) VALUES (:roster_id, :col_room, :col_floor, :col_gender, :col_category, :col_name, :col_kana, :col_hometown, :col_student_num, :col_department)";
                $stmtConfig = $db->prepare($sqlConfig);
                $cols['roster_id'] = $rosterId;
                $stmtConfig->execute($cols);

                // Process Excel
                $spreadsheet = IOFactory::load($filePath);
                $worksheet = $spreadsheet->getActiveSheet();
                $rows = $worksheet->toArray();

                // Remove header if needed? Assuming first row might be header but user specifies columns. 
                // We will try to parse all rows, skipping if empty or header-like? 
                // For simplicity, we assume row 1 is header and skip it, or maybe checking if the content matches column names?
                // The requirement doesn't specify header row index. Let's assume row 1 is header and start from row 2.

                $sqlStudent = "INSERT INTO students (roster_id, internal_id, room, floor, gender, category, name, kana, hometown, student_num, department) VALUES (:roster_id, :internal_id, :room, :floor, :gender, :category, :name, :kana, :hometown, :student_num, :department)";
                $stmtStudent = $db->prepare($sqlStudent);

                for ($i = 1; $i < count($rows); $i++) { // Skip row 0 (header)
                    $row = $rows[$i];
                    // Check if row is empty (sometimes excel has empty trailing rows)
                    if (empty($row[0]) && empty($row[1]))
                        continue;

                    // Helper to get value by 1-based index
                    $getVal = function ($idx) use ($row) {
                        if ($idx === null || $idx === '')
                            return null;
                        $idxInt = intval($idx) - 1; // 0-indexed in array
                        return isset($row[$idxInt]) ? trim($row[$idxInt]) : null;
                    };

                    $studentData = [
                        ':roster_id' => $rosterId,
                        ':internal_id' => generateUUID(),
                        ':room' => $getVal($cols['col_room']),
                        ':floor' => $getVal($cols['col_floor']),
                        ':gender' => $getVal($cols['col_gender']),
                        ':category' => $getVal($cols['col_category']),
                        ':name' => $getVal($cols['col_name']),
                        ':kana' => $getVal($cols['col_kana']),
                        ':hometown' => $getVal($cols['col_hometown']),
                        ':student_num' => $getVal($cols['col_student_num']),
                        ':department' => $getVal($cols['col_department']),
                    ];
                    $stmtStudent->execute($studentData);
                }

                $db->commit();
                echo json_encode(['status' => 'success', 'message' => 'Roster imported successfully', 'id' => $rosterId]);

            } catch (Exception $e) {
                $db->rollBack();
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'File upload failed']);
        }
        break;

    case 'PUT':
        // Update Config
        parse_str(file_get_contents("php://input"), $_PUT);

        $rosterId = $_PUT['id'] ?? null;
        if (!$rosterId) {
            echo json_encode(['status' => 'error', 'message' => 'Missing ID']);
            exit;
        }

        // Fetch existing file path
        $stmt = $db->prepare("SELECT file_name FROM rosters WHERE id = :id");
        $stmt->execute([':id' => $rosterId]);
        $roster = $stmt->fetch();

        if (!$roster) {
            echo json_encode(['status' => 'error', 'message' => 'Roster not found']);
            exit;
        }

        try {
            $db->beginTransaction();

            $cols = [
                'col_room' => $_PUT['col_room'] ?? null,
                'col_floor' => $_PUT['col_floor'] ?? null,
                'col_gender' => $_PUT['col_gender'] ?? null,
                'col_category' => $_PUT['col_category'] ?? null,
                'col_name' => $_PUT['col_name'] ?? null,
                'col_kana' => $_PUT['col_kana'] ?? null,
                'col_hometown' => $_PUT['col_hometown'] ?? null,
                'col_student_num' => $_PUT['col_student_num'] ?? null,
                'col_department' => $_PUT['col_department'] ?? null,
            ];

            // Update Name
            if (isset($_PUT['name'])) {
                $stmt = $db->prepare("UPDATE rosters SET name = :name WHERE id = :id");
                $stmt->execute([':name' => $_PUT['name'], ':id' => $rosterId]);
            }

            // Update Config
            $sqlConfig = "UPDATE roster_config SET col_room=:col_room, col_floor=:col_floor, col_gender=:col_gender, col_category=:col_category, col_name=:col_name, col_kana=:col_kana, col_hometown=:col_hometown, col_student_num=:col_student_num, col_department=:col_department WHERE roster_id=:roster_id";
            $stmtConfig = $db->prepare($sqlConfig);
            $cols['roster_id'] = $rosterId;
            $stmtConfig->execute($cols);

            // Re-process Excel (Delete students and re-insert)
            $db->prepare("DELETE FROM students WHERE roster_id = :id")->execute([':id' => $rosterId]);

            $spreadsheet = IOFactory::load($roster['file_name']);
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            $sqlStudent = "INSERT INTO students (roster_id, internal_id, room, floor, gender, category, name, kana, hometown, student_num, department) VALUES (:roster_id, :internal_id, :room, :floor, :gender, :category, :name, :kana, :hometown, :student_num, :department)";
            $stmtStudent = $db->prepare($sqlStudent);

            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                if (empty($row[0]) && empty($row[1]))
                    continue;

                $getVal = function ($idx) use ($row) {
                    if ($idx === null || $idx === '')
                        return null;
                    $idxInt = intval($idx) - 1;
                    return isset($row[$idxInt]) ? trim($row[$idxInt]) : null;
                };

                $studentData = [
                    ':roster_id' => $rosterId,
                    ':internal_id' => generateUUID(),
                    ':room' => $getVal($cols['col_room']),
                    ':floor' => $getVal($cols['col_floor']),
                    ':gender' => $getVal($cols['col_gender']),
                    ':category' => $getVal($cols['col_category']),
                    ':name' => $getVal($cols['col_name']),
                    ':kana' => $getVal($cols['col_kana']),
                    ':hometown' => $getVal($cols['col_hometown']),
                    ':student_num' => $getVal($cols['col_student_num']),
                    ':department' => $getVal($cols['col_department']),
                ];
                $stmtStudent->execute($studentData);
            }

            $db->commit();
            echo json_encode(['status' => 'success', 'message' => 'Roster updated successfully']);

        } catch (Exception $e) {
            $db->rollBack();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            $data = json_decode(file_get_contents('php://input'));
            $id = $data->id ?? null;
        }

        if (!$id) {
            echo json_encode(['status' => 'error', 'message' => 'Missing ID']);
            exit;
        }

        try {
            $stmt = $db->prepare("DELETE FROM rosters WHERE id = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(['status' => 'success']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;
}
