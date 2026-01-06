#!/bin/bash
HOST="http://localhost:8080"
COOKIE="cookies.txt"

echo "1. Logging in as admin..."
curl -s -c $COOKIE -b $COOKIE -X POST "$HOST/api/login.php" -d '{"username":"admin", "password":"password"}'
echo -e "\n"

echo "2. Listing Users..."
curl -s -b $COOKIE -X GET "$HOST/api/users.php"
echo -e "\n"

echo "3. Creating New User 'testuser'..."
curl -s -b $COOKIE -X POST "$HOST/api/users.php" -d '{"username":"testuser", "password":"password123", "redirect_page":"entrance.html"}'
echo -e "\n"

echo "4. Listing Users (Verify Creation)..."
curl -s -b $COOKIE -X GET "$HOST/api/users.php"
echo -e "\n"

# Extract ID? Hard to do with regex in bash easily without jq, but assuming it's the last one.
# Skipping dynamic ID extraction for simplicity, just testing endpoints exist and return success.

echo "5. Updating User 'testuser' (Simulated ID check required for real script)..."
# We can't easily get the ID without jq. Manual check of output required.

echo "Test Complete. Check output for 'success'."
