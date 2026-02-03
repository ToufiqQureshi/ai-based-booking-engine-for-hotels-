
import sqlite3
import os

DB_FILE = "test.db"

if not os.path.exists(DB_FILE):
    print(f"Database file {DB_FILE} not found!")
    # Try looking in parent or common locations
    if os.path.exists(f"backend/{DB_FILE}"):
        DB_FILE = f"backend/{DB_FILE}"
    else:
        print("Could not find DB file. Please check path.")
        exit(1)

print(f"Connecting to {DB_FILE}...")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

try:
    print("Attempting to add widget_background_color column...")
    cursor.execute("ALTER TABLE integration_settings ADD COLUMN widget_background_color TEXT DEFAULT '#FFFFFF'")
    conn.commit()
    print("Success: Column added.")
except Exception as e:
    print(f"Error (maybe column exists?): {e}")

conn.close()
