import os
from dotenv import load_dotenv 
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types
import shutil
import time

# --- DATABASE INTEGRATION LAYER ---
import sqlite3

def init_sql_db():
    conn = sqlite3.connect("infrastructure.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_nodes (
            token_id TEXT PRIMARY KEY,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_id TEXT,
            cpu_usage TEXT,
            ram_usage TEXT,
            disk_free TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()

def record_node_scan(token_id: str, cpu: str, ram: str, disk: str):
    conn = sqlite3.connect("infrastructure.db")
    cursor = conn.cursor()
    # Ensure node is registered
    cursor.execute("INSERT OR IGNORE INTO system_nodes (token_id) VALUES (?);", (token_id,))
    # Record telemetry row entry
    cursor.execute("""
        INSERT INTO telemetry_history (token_id, cpu_usage, ram_usage, disk_free)
        VALUES (?, ?, ?, ?);
    """, (token_id, cpu, ram, disk))
    conn.commit()
    conn.close()

# Load environmental variables from .env file before anything else runs!
load_dotenv()

from system_scanner import (
    check_software_requirements,
    get_app_compatibility,
    get_app_issue_explanation,
    get_battery_health_info,
    get_large_files,
    get_performance_explanation,
    get_security_check,
    get_slow_apps,
    get_system_diagnostics,
    get_system_info,
    get_storage_insights,
    get_upgrade_advice,
    get_full_diagnosis,
    get_startup_insights,
    get_suspicious_processes,
    get_thermal_status,
)

app = FastAPI()

# Automatically initialize the SQLite architecture on application startup
@app.on_event("startup")
def startup_event():
    try:
        init_sql_db()
        print("💾 Relational SQLite system infrastructure registry booted up successfully.")
    except Exception as e:
        print(f"⚠️ SQLite database initialization deferred: {str(e)}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client (safely reads GEMINI_API_KEY from environment)
client = genai.Client()

# Consolidated Schema Definitions
class ChatMessage(BaseModel):
    role: str       # 'user' or 'model'
    content: str

class ChatPayload(BaseModel):
    messages: List[ChatMessage]
    telemetry: dict
    token_id: Optional[str] = None  # <-- Fixed parameter bridge link!

@app.get("/")
def home():
    return {"message": "AI Advisor backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/health/full")
def health_full():
    results = {}
    ok = True
    try:
        results['battery'] = get_battery_health_info()
    except Exception as e:
        results['battery'] = {"error": str(e)}
        ok = False

    try:
        results['system'] = get_system_diagnostics()
    except Exception as e:
        results['system'] = {"error": str(e)}
        ok = False

    try:
        results['startup'] = get_startup_insights()
    except Exception as e:
        results['startup'] = {"error": str(e)}
        ok = False

    try:
        results['suspicious_processes'] = get_suspicious_processes(limit=5)
    except Exception as e:
        results['suspicious_processes'] = {"error": str(e)}
        ok = False

    try:
        results['thermal'] = get_thermal_status()
    except Exception as e:
        results['thermal'] = {"error": str(e)}
        ok = False

    try:
        results['large_files'] = get_large_files(limit=10)
    except Exception as e:
        results['large_files'] = {"error": str(e)}
        ok = False

    return {"ok": ok, "results": results}


@app.get("/system-info")
def system_info():
    return get_system_info()


@app.get("/advice")
def advice():
    info = get_system_info()
    return {
        "summary": info["summary"],
        "recommendations": info["recommendations"],
    }


@app.get("/slow-apps")
def slow_apps():
    return get_slow_apps()


@app.get("/upgrade-advice")
def upgrade_advice():
    return get_upgrade_advice()


@app.get("/battery-health")
def battery_health():
    return get_battery_health_info()


@app.get("/system-diagnostics")
def system_diagnostics():
    return get_system_diagnostics()


@app.get("/performance-explanation")
def performance_explanation():
    return get_performance_explanation()


@app.get("/storage-insights")
def storage_insights():
    return get_storage_insights()


@app.get("/diagnose")
def diagnose(
    app_name: str | None = None,
    required_memory_gb: float | None = None,
    required_storage_gb: float | None = None,
):
    return get_full_diagnosis(app_name, required_memory_gb, required_storage_gb)


@app.get("/startup-insights")
def startup_insights():
    return get_startup_insights()


@app.get("/suspicious-processes")
def suspicious_processes(limit: int | None = 10):
    return get_suspicious_processes(limit=limit or 10)


@app.get("/thermal-status")
def thermal_status():
    return get_thermal_status()


@app.get("/app-compatibility")
def app_compatibility(
    app_name: str | None = None,
    required_memory_gb: float | None = None,
    required_storage_gb: float | None = None,
):
    return get_app_compatibility(app_name, required_memory_gb, required_storage_gb)


@app.get("/app-issue-explanation")
def app_issue_explanation(
    app_name: str | None = None,
    required_memory_gb: float | None = None,
    required_storage_gb: float | None = None,
):
    return get_app_issue_explanation(app_name, required_memory_gb, required_storage_gb)


@app.get("/security-check")
def security_check():
    return get_security_check()


@app.get("/large-files")
def large_files():
    return get_large_files()


@app.get("/can-run")
def can_run(required_memory_gb: float | None = None, required_storage_gb: float | None = None):
    return check_software_requirements(required_memory_gb, required_storage_gb)


# HISTORICAL TELEMETRY RETRIEVAL PIPELINE
@app.get("/history/{token_id}")
def get_telemetry_history(token_id: str):
    try:
        conn = sqlite3.connect("infrastructure.db")
        cursor = conn.cursor()
        
        # Query past telemetry scans, ordered by the newest records first
        cursor.execute("""
            SELECT cpu_usage, ram_usage, disk_free, timestamp 
            FROM telemetry_history 
            WHERE token_id = ? 
            ORDER BY timestamp DESC
            LIMIT 10;
        """, (token_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        # Format database rows into JSON response dictionary blocks
        history_list = []
        for row in rows:
            history_list.append({
                "cpu": row[0],
                "memory": row[1],
                "storage": row[2],
                "timestamp": row[3]
            })
            
        return {"success": True, "token_id": token_id, "data": history_list}
        
    except Exception as e:
        print(f"❌ DATABASE HISTORY FETCH FAILURE: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database Retrieval Error: {str(e)}")


# DEEP SYSTEM DIAGNOSTICS AI CHAT PIPELINE
@app.post("/chat")
def chat_with_advisor(payload: ChatPayload):
    try:
        start_time = time.time()
        user_query = payload.messages[-1].content if payload.messages else ""
        
        print("\n" + "="*50)
        print(f"📥 DIAGNOSTICS CHAT INBOUND: '{user_query}'")
        print("="*50)

        # 1. Unpack basic & advanced hardware parameters seamlessly
        live_diagnostics = payload.telemetry
        cpu = live_diagnostics.get("cpu", "N/A")
        ram = live_diagnostics.get("memory", "N/A")
        storage = live_diagnostics.get("storage", "N/A")
        
        # Extended Diagnostic Properties
        thermal = live_diagnostics.get("thermal", "Normal / Stable")
        battery = live_diagnostics.get("battery", "AC Power / Connected")
        suspicious_apps = live_diagnostics.get("suspicious_processes", [])

        # 2. Forge a highly context-aware system instruction prompt
        system_instruction = (
            "You are a super bright, warm, and comforting computer mechanic living inside the user's browser. "
            "Your job is to translate complex, scary computer metrics into bright, non-technical, baby-step friendly advice!\n\n"
            "CRITICAL CONTEXT ACCESS: You have complete visibility over live system diagnostics below. "
            "Use this granular hardware context to diagnose their questions proactively. For example, if their thermal "
            "temperatures are spiking or if they have suspicious background processes draining RAM, call it out directly "
            "and suggest friendly fixes!\n\n"
            f"--- LIVE EXTENDED TELEMETRY SNAPSHOT ---\n"
            f"💻 CPU Core Utilization: {cpu}\n"
            f"📊 RAM Allocation Status: {ram}\n"
            f"💽 Available Volume Storage: {storage}\n"
            f"🌡️ Thermal State/Temperature: {thermal}\n"
            f"🔋 Battery Health / Power: {battery}\n"
            f"⚠️ Flagged/Suspicious Background Processes: {suspicious_apps}\n"
            "-----------------------------------------\n\n"
            "STRICT CONTEXT-AWARE BUTTON RULE: Do NOT show the optimization action component by default for casual conversations, greeting queries (like 'hi' or 'hello'), or generic chit-chat. "
            "You must ONLY append the exact tracking string '[SHOW_FIX_BUTTON]' at the terminal character sequence of your message body if: "
            "1. The user explicitly prompts you to purge system objects, optimize active performance margins, or perform directory sweeps.\n"
            "2. They are encountering explicit local volume strain or extreme background process degradation and you determine that an automated cleanup is a viable step.\n"
            "Otherwise, omit this sequence entirely to ensure the layout mechanism remains invisible during casual dialogue.\n\n"
            "CRITICAL FORMATTING RULE: Do not use any markdown formatting syntax. Never wrap phrases in double asterisks (like **bold**). "
            "Keep the returned response text strictly clean and readable."
        )
        
        contents = []
        for msg in payload.messages:
            api_role = "model" if msg.role == "model" else "user"
            contents.append(
                types.Content(role=api_role, parts=[types.Part.from_text(text=msg.content)])
            )
        # CRITICAL FAILOVER POOL (Cleaned up for 2026 active endpoints)
        free_models_pool = [
            'gemini-3.5-flash',       # Try the latest production speed core first!
            'gemini-3-flash-preview', # First runner-up (Gemini 3 Preview)
            'gemini-2.5-flash',       # Bulletproof stable backup fallback 
            'gemini-3.1-flash-lite'   # Fast, ultra-light tier to capture remnants
        ]
        
        response = None
        last_error = None

        for model_name in free_models_pool:
            try:
                print(f"🤖 Attempting text generation with model identifier: {model_name}")
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction, # Let's fallback to plain string configuration
                        temperature=0.6
                    )
                )
                break
            except Exception as model_err:
                print(f"⚠️ Model {model_name} validation breakdown: {str(model_err)}")
                last_error = model_err
                continue

        if response is None:
            print(f"❌ ALL CHAT MODELS EXHAUSTED. LAST SDK RESIDUAL ERROR: {str(last_error)}")
            raise last_error or Exception("All free model pathways are fully exhausted.")
        
        # 3. Synchronize log records to our local SQLite engine (Wrapped in a strict, isolated try/except block)
        try:
            target_token = payload.token_id or "GUEST"
            # Extract plain text content values to prevent saving rich structures into text columns
            cpu_val = str(cpu.get("usage_percent", "0%")) if isinstance(cpu, dict) else str(cpu)
            ram_val = f"{ram.get('used_gb', '0')} / {ram.get('total_gb', '0')} GB" if isinstance(ram, dict) else str(ram)
            storage_val = str(storage.get("free_percent", "0%")) if isinstance(storage, dict) else str(storage)
            
            record_node_scan(
                token_id=target_token,
                cpu=cpu_val,
                ram=ram_val,
                disk=storage_val
            )
            print(f"💾 Extended telemetry logged to database for user: {target_token}")
        except Exception as db_sync_err:
            print(f"⚠️ Database write bypassed due to parameter formatting mismatch: {str(db_sync_err)}")

        print(f"⏱️ PIPELINE PROCESS TIME: {time.time() - start_time:.2f} seconds")
        print("="*50 + "\n")
        
        return {"response": response.text}

    except Exception as e:
        print(f"❌ CHAT ENGINE PIPELINE EXCEPTION: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gemini Processing Error: {str(e)}")


# PROACTIVE REAL-TIME CLEANUP ROUTE (WITH PERMISSION BYPASS)
@app.post("/optimize")
def run_optimization():
    try:
        print("🧹 Genuinely purging temporary folders in real-time...")
        
        user_temp = os.environ.get("TEMP")
        system_temp = os.path.join(os.environ.get("SystemRoot", "C:\\Windows"), "Temp")
        
        cleaned_count = 0
        freed_bytes = 0
        
        for folder in [user_temp, system_temp]:
            if folder and os.path.exists(folder):
                try:
                    items = os.listdir(folder)
                except Exception as dir_err:
                    print(f"⚠️ Skipping folder {folder} due to system permissions: {str(dir_err)}")
                    continue

                for item in items:
                    item_path = os.path.join(folder, item)
                    try:
                        if os.path.isfile(item_path) or os.path.islink(item_path):
                            file_size = os.path.getsize(item_path)
                            os.unlink(item_path)
                            freed_bytes += file_size
                            cleaned_count += 1
                        elif os.path.isdir(item_path):
                            dir_size = 0
                            for root, dirs, files_list in os.walk(item_path):
                                dir_size += sum(os.path.getsize(os.path.join(root, f)) for f in files_list)
                            shutil.rmtree(item_path)
                            freed_bytes += dir_size
                            cleaned_count += 1
                    except Exception:
                        continue
        
        freed_mb = freed_bytes / (1024 * 1024)
        print(f"✨ Purge complete: processed {cleaned_count} entities ({freed_mb:.2f} MB cleared).")
        
        return {
            "success": True, 
            "message": f"Optimization complete! I did a real-time sweep and wiped away {cleaned_count} dusty temporary cache items, safely freeing up {freed_mb:.2f} MB of space! ✨"
        }
    except Exception as e:
        print(f"❌ OPTIMIZATION ROUTE EXCEPTION: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cleanup Script Error: {str(e)}")