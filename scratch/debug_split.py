import os
SQL_FILE_PATH = r"c:\PRISM-RAG-CHATBOT\PRISM_Complete_Package\PRISM_Complete_Package\prism5_Black_&_Pink_One V2\backend\core\quality\quality_queries.sql"
with open(SQL_FILE_PATH, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()

marker = "-- COMPOSITE SCORE"
count = content.count(marker)
print(f"Marker count: {count}")

parts = content.split(marker)
for i, part in enumerate(parts):
    print(f"Part {i} length: {len(part)}")
    if i > 0:
        print(f"Part {i} start: {part[:50]}")
