<?php
// ===== DB CONFIG — My Café =====
// ตั้งค่าให้ตรงกับ phpMyAdmin ของคุณ (ตอนนี้ใช้ค่าเดียวกับ insert.php เดิม)
$DB_HOST = "localhost";
$DB_USER = "root";
$DB_PASS = "";
$DB_NAME = "my_cafe_db";
$DB_PORT = 3307;

// PHP 8.1+ ทำให้ mysqli โยน exception ดิบ ๆ ทันทีถ้าเชื่อมต่อไม่สำเร็จ
// (ก่อนที่โค้ดข้างล่างจะได้เช็ค connect_error ด้วยซ้ำ) ปิดโหมดนี้ก่อน
// เพื่อให้เช็ค error แบบปกติได้ และส่ง JSON error ที่อ่านรู้เรื่องกลับไปแทน
mysqli_report(MYSQLI_REPORT_OFF);

$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME, $DB_PORT);

if ($conn->connect_error) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["error" => "เชื่อมต่อฐานข้อมูลไม่สำเร็จ: " . $conn->connect_error]);
    exit();
}

$conn->set_charset("utf8mb4");