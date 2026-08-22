<?php
$servername = "localhost";
$username = "root";
$password = ""; 
$dbname = "my_cafe_db";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname,3307);
// Check connection
if ($conn->connect_error) {
  //die("Connection failed: " . $conn->connect_error);
  echo "<script>console.error('Database Connection Failed: " . addslashes($conn->connect_error) . "');</script>";
    die();
}

$sql = "INSERT INTO menu (category_id, name, description, price, emoji, is_available)
VALUES ('".$_POST['category_id']."', '".$_POST['name']."', '".$_POST['description']."', '".$_POST['price']."', '".$_POST['emoji']."', '".$_POST['is_available']."')";

if ($conn->query($sql) === TRUE) {
    echo "New record created successfully"  ;
} else {
    echo "<script>console.error('Error: " . addslashes($sql) . " - " . addslashes($conn->error) . "');</script>";
    }

$conn->close();
?>
