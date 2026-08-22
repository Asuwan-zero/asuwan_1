<?php
// ===== CATEGORIES API — My Café =====
// GET    /api/categories.php        -> ดึงหมวดหมู่ทั้งหมด
// POST   /api/categories.php        -> เพิ่มหมวดหมู่ใหม่ { name }
// PUT    /api/categories.php?id=1   -> แก้ไขชื่อหมวดหมู่ { name }
// DELETE /api/categories.php?id=1   -> ลบหมวดหมู่ (ลบไม่ได้ถ้ายังมีเมนูอยู่ในหมวดนี้)

header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../db_config.php';

$method = $_SERVER['REQUEST_METHOD'];

function cat_input_json() {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

if ($method === 'GET') {
    $result = $conn->query("SELECT category_id, name FROM categories ORDER BY category_id ASC");
    if ($result === false) {
        http_response_code(500);
        echo json_encode(["error" => "SQL error: " . $conn->error]);
        exit();
    }
    $cats = [];
    while ($row = $result->fetch_assoc()) {
        $cats[] = $row;
    }
    echo json_encode($cats);
    exit();
}

if ($method === 'POST') {
    $d = cat_input_json();
    $name = trim($d['name'] ?? '');
    if ($name === '') {
        http_response_code(400);
        echo json_encode(["error" => "กรุณากรอกชื่อหมวดหมู่"]);
        exit();
    }
    $stmt = $conn->prepare("INSERT INTO categories (name) VALUES (?)");
    $stmt->bind_param("s", $name);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "category_id" => $stmt->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $stmt->error]);
    }
    $stmt->close();
    exit();
}

if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $d = cat_input_json();
    $name = trim($d['name'] ?? '');
    if (!$id || $name === '') {
        http_response_code(400);
        echo json_encode(["error" => "ข้อมูลไม่ครบ"]);
        exit();
    }
    $stmt = $conn->prepare("UPDATE categories SET name = ? WHERE category_id = ?");
    $stmt->bind_param("si", $name, $id);
    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $stmt->error]);
    }
    $stmt->close();
    exit();
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "ไม่พบ id ของหมวดหมู่ที่จะลบ"]);
        exit();
    }
    $check = $conn->prepare("SELECT COUNT(*) AS c FROM menu WHERE category_id = ?");
    $check->bind_param("i", $id);
    $check->execute();
    $count = $check->get_result()->fetch_assoc()['c'];
    $check->close();
    if ($count > 0) {
        http_response_code(400);
        echo json_encode(["error" => "ไม่สามารถลบได้ มี $count เมนูอยู่ในหมวดนี้"]);
        exit();
    }
    $stmt = $conn->prepare("DELETE FROM categories WHERE category_id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $stmt->error]);
    }
    $stmt->close();
    exit();
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);