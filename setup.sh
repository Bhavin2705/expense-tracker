#!/bin/bash

# =============================================
# Dump file contents with headers
# Run this from project root
# =============================================

OUTPUT="dump.txt"
> "$OUTPUT"  # Clear file

echo "============================================" >> "$OUTPUT"
echo "📁 FILE DUMP - $(date)" >> "$OUTPUT"
echo "============================================" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Add files you want to dump here
files=(
  "src/controllers/expense.controller.js"
  "src/models/Expense.js"
  "src/middleware/uploadReceipt.js"
  "src/routes/expense.routes.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "🔹 FILE: $file" >> "$OUTPUT"
    echo "────────────────────────────────────────────" >> "$OUTPUT"
    cat "$file" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo "────────────────────────────────────────────" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo "✅ Dumped: $file"
  else
    echo "⚠️  File not found: $file" | tee -a "$OUTPUT"
  fi
done

echo "🎉 All files dumped to $OUTPUT"