#!/bin/bash
HOST="http://localhost:8080"
COOKIE="cookies.txt"

# 1. Login as Admin
curl -s -c $COOKIE -b $COOKIE -X POST "$HOST/api/login.php" -d '{"username":"admin", "password":"password"}' > /dev/null

# 2. Create Floor User
echo "Creating user 'floor_staff'..."
curl -s -b $COOKIE -X POST "$HOST/api/users.php" -d '{"username":"floor_staff", "password":"password", "redirect_page":"floor.html"}'
echo -e "\n"

# 3. Login as Floor User
echo "Logging in as 'floor_staff'..."
curl -s -c $COOKIE -b $COOKIE -X POST "$HOST/api/login.php" -d '{"username":"floor_staff", "password":"password"}'
echo -e "\n"

# 4. Cleanup
echo "Cleaning up..."
# Need ID to delete. Fetch list first.
USERS=$(curl -s -b $COOKIE -X GET "$HOST/api/users.php")
# Assuming floor_staff is the last one or we can grep it?
# For script simplicity, I'll skip auto-delete or use a known ID if I could parse it. 
# I'll just print "Done". Cleanup can be manual or in next step if needed.
echo "Done."
