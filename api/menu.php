<?php
// ===== MENU API — My Café =====
// GET    /api/menu.php            -> ดึงเมนูทั้งหมด (join ชื่อหมวดหมู่มาด้วย)
// POST   /api/menu.php            -> เพิ่มเมนูใหม่ (body เป็น JSON)
// PUT    /api/menu.php?id=5       -> แก้ไขเมนู id=5 (body เป็น JSON)
// DELETE /api/menu.php?id=5       -> ลบเมนู id=5

header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../db_config.php';

$method = $_SERVER['REQUEST_METHOD'];

function input_json() {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

if ($method === 'GET') {
    // ดึงเมนูทั้งหมด พร้อมชื่อหมวดหมู่
    $sql = "SELECT m.menu_id, m.category_id, c.name AS category_name,
                   m.name, m.description, m.price, m.emoji, m.is_available, m.is_featured, m.created_at
            FROM menu m
            LEFT JOIN categories c ON c.category_id = m.category_id
            ORDER BY m.menu_id ASC";
    $result = $conn->query($sql);
    if ($result === false) {
        http_response_code(500);
        echo json_encode(["error" => "SQL error: " . $conn->error]);
        exit();
    }
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $row['price'] = (float)$row['price'];
        $row['is_available'] = (int)$row['is_available'];
        $row['is_featured'] = (int)$row['is_featured'];
        $items[] = $row;
    }
    echo json_encode($items);
    exit();
}

if ($method === 'POST') {
    $d = input_json();
    foreach (['category_id', 'name', 'price'] as $required) {
        if (!isset($d[$required]) || $d[$required] === '') {
            http_response_code(400);
            echo json_encode(["error" => "กรุณากรอก $required"]);
            exit();
        }
    }

    $stmt = $conn->prepare(
        "INSERT INTO menu (category_id, name, description, price, emoji, is_available, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $category_id  = (int)$d['category_id'];
    $name         = $d['name'];
    $description  = $d['description'] ?? '';
    $price        = (float)$d['price'];
    $emoji        = $d['emoji'] ?? '🍽️';
    $is_available = isset($d['is_available']) ? (int)$d['is_available'] : 1;
    $is_featured  = isset($d['is_featured']) ? (int)$d['is_featured'] : 0;

    $stmt->bind_param("issdsii", $category_id, $name, $description, $price, $emoji, $is_available, $is_featured);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "menu_id" => $stmt->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $stmt->error]);
    }
    $stmt->close();
    exit();
}

if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "ไม่พบ id ของเมนูที่จะแก้ไข"]);
        exit();
    }
    $d = input_json();

    $stmt = $conn->prepare(
        "UPDATE menu SET category_id = ?, name = ?, description = ?, price = ?, emoji = ?, is_available = ?, is_featured = ?
         WHERE menu_id = ?"
    );
    $category_id  = (int)$d['category_id'];
    $name         = $d['name'];
    $description  = $d['description'] ?? '';
    $price        = (float)$d['price'];
    $emoji        = $d['emoji'] ?? '🍽️';
    $is_available = isset($d['is_available']) ? (int)$d['is_available'] : 1;
    $is_featured  = isset($d['is_featured']) ? (int)$d['is_featured'] : 0;

    $stmt->bind_param("issdsiii", $category_id, $name, $description, $price, $emoji, $is_available, $is_featured, $id);

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
        echo json_encode(["error" => "ไม่พบ id ของเมนูที่จะลบ"]);
        exit();
    }
    $stmt = $conn->prepare("DELETE FROM menu WHERE menu_id = ?");
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