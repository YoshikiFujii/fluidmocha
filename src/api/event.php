<?php
require_once 'db.php';

$database = new DB();
$db = $database->connect();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    // Method spoofing check
    if (isset($input['_method']) && $input['_method'] === 'PUT') {
        $method = 'PUT';
    }
}

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            // Get event details + student list with attendance
            $eventId = $_GET['id'];

            // Event info
            $stmt = $db->prepare("SELECT e.*, r.name as roster_name FROM events e JOIN rosters r ON e.roster_id = r.id WHERE e.id = :id");
            $stmt->execute([':id' => $eventId]);
            $event = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                echo json_encode(['status' => 'error', 'message' => 'Event not found']);
                exit;
            }

            // Students with attendance status
            // We need all students from the roster, and left join attendance for this event
            $sql = "SELECT s.*, a.status, a.note, a.updated_at 
                    FROM students s 
                    LEFT JOIN attendance a ON s.internal_id = a.student_internal_id AND a.event_id = :event_id
                    WHERE s.roster_id = :roster_id
                    ORDER BY s.room ASC, s.student_num ASC"; // Default sort

            $stmt = $db->prepare($sql);
            $stmt->execute([':event_id' => $eventId, ':roster_id' => $event['roster_id']]);
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['event' => $event, 'students' => $students]);

        } else {
            // List events
            $stmt = $db->query("SELECT e.*, r.name as roster_name, (SELECT COUNT(*) FROM attendance WHERE event_id = e.id AND status = 'present') as present_count FROM events e JOIN rosters r ON e.roster_id = r.id ORDER BY e.created_at DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    case 'POST':
        // Create Event
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->name) || !isset($data->roster_id)) {
            echo json_encode(['status' => 'error', 'message' => 'Missing name or roster_id']);
            exit;
        }

        try {
            $preset = $data->preset ?? 'default';
            $stmt = $db->prepare("INSERT INTO events (name, roster_id, preset) VALUES (:name, :roster_id, :preset)");
            $stmt->execute([':name' => $data->name, ':roster_id' => $data->roster_id, ':preset' => $preset]);
            echo json_encode(['status' => 'success', 'message' => 'Event created', 'id' => $db->lastInsertId()]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        // Update Attendance or Event
        $data = json_decode(file_get_contents('php://input'));

        // Check if this is an attendance update or event update
        if (isset($data->student_internal_id)) {
            // Attendance Update
            if (!isset($data->event_id) || !isset($data->student_internal_id)) {
                echo json_encode(['status' => 'error', 'message' => 'Missing fields']);
                exit;
            }

            try {
                // Check if row exists
                $stmt = $db->prepare("SELECT id, status, note FROM attendance WHERE event_id = :eid AND student_internal_id = :sid");
                $stmt->execute([':eid' => $data->event_id, ':sid' => $data->student_internal_id]);
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($existing) {
                    // Update
                    $status = isset($data->status) ? $data->status : $existing['status'];
                    $note = isset($data->note) ? $data->note : $existing['note'];

                    $update = $db->prepare("UPDATE attendance SET status = :status, note = :note WHERE id = :id");
                    $update->execute([':status' => $status, ':note' => $note, ':id' => $existing['id']]);
                } else {
                    // Insert
                    $status = $data->status ?? 'absent';
                    $note = $data->note ?? '';
                    $insert = $db->prepare("INSERT INTO attendance (event_id, student_internal_id, status, note) VALUES (:eid, :sid, :status, :note)");
                    $insert->execute([':eid' => $data->event_id, ':sid' => $data->student_internal_id, ':status' => $status, ':note' => $note]);
                }
                echo json_encode(['status' => 'success']);
            } catch (PDOException $e) {
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
        } else {
            // Event Update (Rename)
            if (!isset($data->id) || !isset($data->name)) {
                echo json_encode(['status' => 'error', 'message' => 'Missing ID or Name']);
                exit;
            }
            try {
                $stmt = $db->prepare("UPDATE events SET name = :name WHERE id = :id");
                $stmt->execute([':name' => $data->name, ':id' => $data->id]);
                echo json_encode(['status' => 'success']);
            } catch (PDOException $e) {
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
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
            $stmt = $db->prepare("DELETE FROM events WHERE id = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(['status' => 'success']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        break;
}
