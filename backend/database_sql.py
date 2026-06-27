import sqlite3
from datetime import datetime

DB_NAME = "infrastructure.db"

def init_sql_db():
    """Initializes SQLite connection pathways and relational table schemas."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Core Table: Keeps node tokens and current completion status markers
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_nodes (
            token_id TEXT PRIMARY KEY,
            created_at TEXT,
            has_scanned INTEGER DEFAULT 0,
            last_scan_time TEXT
        )
    ''')
    
    # Analytics Table: Logs continuous snapshots over time (One-to-Many Relationship)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS telemetry_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_id TEXT,
            cpu_usage TEXT,
            memory_usage TEXT,
            storage_free TEXT,
            timestamp TEXT,
            FOREIGN KEY(token_id) REFERENCES system_nodes(token_id)
        )
    ''')
    conn.commit()
    conn.close()

def record_node_scan(token_id: str, cpu: str, ram: str, disk: str):
    """Saves telemetry markers into relational columns and timestamps them."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    
    # Upsert node registration
    cursor.execute('''
        INSERT INTO system_nodes (token_id, created_at, has_scanned, last_scan_time)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(token_id) DO UPDATE SET has_scanned=1, last_scan_time=?
    ''', (token_id, now, now, now))
    
    # Append to long-term audit trail history table
    cursor.execute('''
        INSERT INTO telemetry_history (token_id, cpu_usage, memory_usage, storage_free, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (token_id, cpu, ram, disk, now))
    
    conn.commit()
    conn.close()