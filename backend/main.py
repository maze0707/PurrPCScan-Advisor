import os
from dotenv import load_dotenv # <-- Added for production-ready security
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from google import genai
from google.genai import types
import shutil
import time

# Load environmental variables from the secret .env file before anything else runs!
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


# ULTRA-LIGHTWEIGHT CHAT PIPELINE - 100% BULLETPROOF
@app.post("/chat")
def chat_with_advisor(payload: ChatPayload):
    try:
        start_time = time.time()
        user_query = payload.messages[-1].content if payload.messages else ""
        
        print("\n" + "="*50)
        print(f"📥 NEW CHAT MESSAGE: '{user_query}'")
        print("="*50)

        # Grab a snapshot of the hardware details automatically
        print("🚀 Passing baseline hardware telemetry to advisor context...")
        live_diagnostics = payload.telemetry

        # Construct system instructions with context-dependent validation rules
        system_instruction = (
            "You are a super bright, warm, and comforting computer mechanic living inside the user's browser. "
            "Your job is to translate clunky computer metrics into bright, non-technical, baby-step friendly but not too long advice! "
            "CRITICAL ACCESS DIRECTIVE: You have authorization and live system telemetry context provided below. "
            "You MUST parse the diagnostic layout dataset to explicitly isolate large files, stale software downloads, or clear system storage thresholds "
            "when assisting with performance bottlenecks.\n\n"
            "STRICT CONTEXT-AWARE BUTTON RULE: Do NOT show the optimization action component by default for casual conversations, greeting queries (like 'hi' or 'hello'), or generic chit-chat. "
            "You must ONLY append the exact tracking string '[SHOW_FIX_BUTTON]' at the terminal character sequence of your message body if: "
            "1. The user explicitly prompts you to purge system objects, optimize active performance margins, or perform directory sweeps.\n"
            "2. They are encountering explicit local volume strain and you determine that an automated system temporary folder clearance is a viable step.\n"
            "Otherwise, omit this sequence entirely to ensure the layout mechanism remains invisible during casual dialogue.\n\n"
            "CRITICAL FORMATTING RULE: Do not use any markdown formatting syntax. Never wrap phrases in double asterisks (like **bold**). "
            "Keep the returned response text strictly clean and readable.\n\n"
            f"--- LIVE TELEMETRY SNAPSHOT DATA ---\n{live_diagnostics}\n--------------------------------------"
        )
        
        contents = []
        for msg in payload.messages:
            api_role = "model" if msg.role == "model" else "user"
            contents.append(
                types.Content(role=api_role, parts=[types.Part.from_text(text=msg.content)])
            )
        
        # Standard free-tier call utilizing the stable working identifier format
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_instruction, temperature=0.5)
        )
        
        print(f"⏱️ TOTAL ROUND-TRIP TIME: {time.time() - start_time:.2f} seconds")
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
        
        # Paths to standard Windows temporary storage dumps
        user_temp = os.environ.get("TEMP")
        system_temp = os.path.join(os.environ.get("SystemRoot", "C:\\Windows"), "Temp")
        
        cleaned_count = 0
        freed_bytes = 0
        
        # Execute folder content evaluation checks safely
        for folder in [user_temp, system_temp]:
            if folder and os.path.exists(folder):
                try:
                    # Wrap directory reading in a try-block to catch Windows PermissionErrors
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
                        # Safely bypass active files flagged as locked by open background apps
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