#!/bin/bash

echo "==================================="
echo "COPY AND PASTE THE FOLLOWING SQL INTO SUPABASE SQL EDITOR"
echo "Go to: https://supabase.com/dashboard/project/nnkoqjwguzoyfcvbdrqi/sql/new"
echo "==================================="
echo ""

# Combine all migration files
for file in supabase/migrations/*.sql; do
    echo "-- ========================================="
    echo "-- Migration: $(basename $file)"
    echo "-- ========================================="
    cat "$file"
    echo ""
    echo ""
done

echo "-- ========================================="
echo "-- END OF MIGRATIONS"
echo "-- ========================================="