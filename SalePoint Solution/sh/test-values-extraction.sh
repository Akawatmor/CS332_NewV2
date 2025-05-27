#!/bin/bash

# Test full VALUES extraction
SQL_FILE="database/simple-data.sql"

echo "=== TESTING FULL VALUES EXTRACTION ==="

# Test customers extraction
echo "--- CUSTOMERS SECTION ---"
customers_section=$(sed -n '/INSERT INTO customers/,/;$/p' "$SQL_FILE")
echo "Full customers section:"
echo "$customers_section"
echo ""

echo "--- CUSTOMERS VALUES (grep method) ---"
customer_values=$(echo "$customers_section" | grep -E "^\('.*'\),?$")
echo "$customer_values"
echo ""

echo "--- CUSTOMERS VALUES (alternative method) ---"
# Try alternative extraction without ending pattern constraint
customer_values_alt=$(sed -n '/INSERT INTO customers/,/;$/p' "$SQL_FILE" | sed -n '/VALUES/,/;$/p' | grep -E "^\('.*")
echo "$customer_values_alt"
echo ""

# Test staff extraction
echo "--- STAFF SECTION ---"
staff_section=$(sed -n '/INSERT INTO sales_staff/,/;$/p' "$SQL_FILE")
echo "Full staff section:"
echo "$staff_section"
echo ""

echo "--- STAFF VALUES ---"
staff_values=$(echo "$staff_section" | grep -E "^\('.*'\),?$")
echo "$staff_values"
echo ""
