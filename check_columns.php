<?php
require __DIR__ . '/db_config.php';
$r = $conn->query('SHOW COLUMNS FROM menu');
while ($row = $r->fetch_assoc()) {
    echo $row['Field'] . ' | ' . $row['Type'] . ' | default=' . $row['Default'] . PHP_EOL;//ดึงข้อมูลแต่ละแถว
}

echo "\n--- Current menu data (is_featured check) ---\n";
$r2 = $conn->query('SELECT menu_id, name, is_featured FROM menu LIMIT 20');
if ($r2 === false) {
    echo "is_featured column probably doesn't exist: " . $conn->error . PHP_EOL;
} else {
    while ($row = $r2->fetch_assoc()) {
        echo $row['menu_id'] . ' | ' . $row['name'] . ' | is_featured=' . $row['is_featured'] . PHP_EOL;
    }
}
