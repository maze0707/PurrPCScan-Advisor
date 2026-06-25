from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
from typing import List
from google import genai
from google.genai import types

class ChatMessage(BaseModel):
    role: str       # 'user' or 'model'
    content: str

class ChatPayload(BaseModel):
    messages: List[ChatMessage]

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


@app.get("/")
def home():
    return {"message": "AI Advisor backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/health/full")
def health_full():
    """Run a set of quick smoke checks and return pass/fail JSON suitable for automated monitors.

    This calls several lightweight diagnostics and returns their results. The endpoint is
    conservative: it reports details and indicates overall `ok` if the checks ran without exceptions.
    """
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



# Initialize Gemini Client (Uses the environment variable you just set)
client = genai.Client()

# 1. Your ChatMessage schema stays exactly like this:
class ChatMessage(BaseModel):
    role: str       # 'user' or 'model'
    content: str

# 2. Update your ChatPayload to accept the incoming data dictionary:
class ChatPayload(BaseModel):
    messages: List[ChatMessage]
    telemetry: dict  # <-- Just add this single line here!

# 3. Swap in your new high-speed endpoint:
@app.post("/chat")
def chat_with_advisor(payload: ChatPayload):
    try:
        # 1. Grab the last message the user just typed
        user_query = payload.messages[-1].content.lower() if payload.messages else ""
        
        # 2. Smart Keywords that trigger a deep hardware/file investigation
        deep_keywords = ["file", "download", "slow", "process", "delete", "clear", "space", "my pc", "my computer", "cleanup", "ram", "cpu", "drive", "storage"]
        
        # Check if the user is asking for real-time local system output
        requires_deep_scan = any(keyword in user_query for keyword in deep_keywords)
        
        if requires_deep_scan:
            print("🔍 Deep diagnostic query detected. Running full system scan...")
            live_diagnostics = get_full_diagnosis()
        else:
            print("⚡ Simple query detected. Using instant cache...")
            live_diagnostics = payload.telemetry

        # 3. Formulate the cozy instruction block
        system_instruction = (
            "You are a super bright, warm, and comforting computer mechanic living inside the user's browser. "
            "Your job is to translate clunky computer metrics into bright, non-technical, baby-step friendly but not too long advice! "
            "You have direct access to their live system data provided below. Use this information to explicitly "
            "name specific files, old downloads, heavy applications, or metrics if they are looking to clean things up or troubleshoot. "
            "Always explain your findings using comforting, baby-step analogies.\n\n"
            "CRITICAL FORMATTING RULE: Do not use any markdown formatting characters. Never wrap words in double asterisks (like **bold**). "
            "Keep the text clean, plain, and easy to read.\n\n"
            f"--- LIVE TELEMETRY SNAPSHOT DATA ---\n{live_diagnostics}\n--------------------------------------"
        )
        
        # 4. Process the message logs
        contents = []
        for msg in payload.messages:
            contents.append(
                types.Content(
                    role=msg.role,
                    parts=[types.Part.from_text(text=msg.content)]
                )
            )
            
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.5
            )
        )
        
        return {"response": response.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini Processing Error: {str(e)}")