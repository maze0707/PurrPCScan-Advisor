import os
import shutil
import time
from pathlib import Path

import psutil
import subprocess
import platform
import tempfile
import re


def _best_effort_wmic_first_line(args: list[str]) -> str | None:
    """
    Best-effort WMIC helper. Returns the first non-empty line or None.
    """
    try:
        out = subprocess.check_output(args, text=True, stderr=subprocess.DEVNULL)
        lines = [l.strip() for l in out.splitlines() if l.strip()]
        if not lines:
            return None
        # remove header-ish line if present (wmic outputs header + data)
        # take the last line as "best-effort value"
        return lines[-1]
    except Exception:
        return None


def _get_primary_gpu_name() -> str:
    # win32_VideoController can list multiple; we take the last non-empty value.
    name = _best_effort_wmic_first_line(
        ["wmic", "path", "win32_VideoController", "get", "Name"]
    )
    # Sometimes the output includes placeholder headers; clean it.
    if name and name.lower() in {"name", "videocontroller", "n/a"}:
        return "Unknown GPU"
    return name or "Unknown GPU"


def _get_windows_os_type_and_version() -> dict:
    """
    Returns:
      - type: e.g., Windows 11 Pro / Windows 11 Home (best-effort from Caption)
      - version: best-effort OS version/build number
    """
    # Caption includes edition+name on Windows (best-effort).
    caption = _best_effort_wmic_first_line(["wmic", "os", "get", "Caption"])
    # Version/build best-effort:
    # platform.version() gives kernel build string; platform.release() gives major/minor.
    # We'll provide both as strings but keep "version" field human-friendly.
    version = platform.version() or ""
    release = platform.release() or ""
    if version and release and release not in version:
        version_display = f"{version} ({release})"
    else:
        version_display = version or release or "Unknown"

    # Normalize "type" to the edition-ish part (caption).
    type_display = caption or "Windows (unknown edition)"
    return {
        "type": type_display,
        "version": version_display,
    }


def get_system_info():
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    storage = shutil.disk_usage("C:\\")
    battery = psutil.sensors_battery()

    cpu_status = "Your computer's processor is not very busy right now."
    if cpu_percent >= 80:
        cpu_status = "Your computer's processor is working very hard right now. This can make apps feel slow."
    elif cpu_percent >= 50:
        cpu_status = "Your computer's processor is moderately busy right now. It should still handle normal tasks."

    total_memory_gb = round(memory.total / (1024**3), 1)
    available_memory_gb = round(memory.available / (1024**3), 1)
    total_storage_gb = round(storage.total / (1024**3), 1)
    free_storage_gb = round(storage.free / (1024**3), 1)
    storage_free_percent = round((storage.free / storage.total) * 100, 1)

    recommendations = []

    if cpu_percent >= 80:
        recommendations.append(
            "Your processor is under heavy load. If the computer feels slow, close demanding apps or browser tabs."
        )

    if available_memory_gb < 2:
        recommendations.append(
            "Your computer is low on free memory right now. Closing a few apps may make it feel faster."
        )

    if storage_free_percent < 10:
        recommendations.append(
            "Your main drive is running low on space. Freeing up storage soon can help prevent slowdowns."
        )

    battery_info = {
        "available": False,
        "plain_english": "Battery information is not available on this computer.",
    }
    if battery is not None:
        battery_percent = round(battery.percent, 1)
        plugged_in = battery.power_plugged
        charging_status = "plugged in" if plugged_in else "running on battery"

        battery_info = {
            "available": True,
            "percent": battery_percent,
            "plugged_in": plugged_in,
            "plain_english": (
                f"Your battery is at {battery_percent}% and the computer is {charging_status}."
            ),
        }

        if battery_percent < 20 and not plugged_in:
            recommendations.append(
                "Your battery is low. Plug in your charger soon to avoid the computer shutting down."
            )

    if not recommendations:
        recommendations.append(
            "Your basic memory and storage look usable right now. We can keep monitoring them as the app grows."
        )

    summary = "Your computer looks usable right now."
    if cpu_percent >= 80 or available_memory_gb < 2 or storage_free_percent < 10:
        summary = "Your computer is usable, but there are a few things that may affect performance."

    gpu_name = _get_primary_gpu_name()
    os_info = _get_windows_os_type_and_version() if platform.system().lower() == "windows" else {
        "type": "Unknown OS",
        "version": platform.version() or "Unknown",
    }

    return {
        "summary": summary,
        "cpu": {
            "usage_percent": cpu_percent,
            "plain_english": cpu_status,
        },
        "memory": {
            "total_gb": total_memory_gb,
            "available_gb": available_memory_gb,
            "plain_english": (
                f"Your computer has {total_memory_gb} GB of memory. "
                f"About {available_memory_gb} GB is currently free for apps."
            ),
        },
        "storage": {
            "total_gb": total_storage_gb,
            "free_gb": free_storage_gb,
            "free_percent": storage_free_percent,
            "plain_english": (
                f"Your main drive has {total_storage_gb} GB of space. "
                f"About {free_storage_gb} GB is still available."
            ),
        },
        "gpu": {
            "primary_name": gpu_name,
        },
        "os": {
            "type": os_info.get("type", "Unknown OS"),
            "version": os_info.get("version", "Unknown"),
        },
        "battery": battery_info,
        "recommendations": recommendations,
        "what_to_do_next": recommendations,
    }


def get_slow_apps(limit=5):
    apps = []
    processes = []

    for process in psutil.process_iter(["pid", "name"]):
        try:
            process.cpu_percent(interval=None)
            processes.append(process)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    time.sleep(0.5)

    for process in processes:
        try:
            process_name = process.name() or "Unknown app"
            if process.pid == 0 or process_name.lower() == "system idle process":
                continue

            memory_mb = process.memory_info().rss / (1024**2)
            cpu_percent = min(round(process.cpu_percent(interval=None), 1), 100.0)
            apps.append(
                {
                    "pid": process.pid,
                    "name": process_name,
                    "cpu_percent": cpu_percent,
                    "memory_mb": round(memory_mb, 1),
                }
            )
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    apps.sort(key=lambda app: (app["cpu_percent"], app["memory_mb"]), reverse=True)
    top_apps = apps[:limit]

    if not top_apps:
        return {
            "summary": "I could not find any app usage details right now.",
            "apps": [],
        }

    return {
        "summary": "These apps are using the most processor or memory right now.",
        "apps": top_apps,
        "plain_english": (
            "If your computer feels slow, these are the first apps to check or close."
        ),
    }


def get_upgrade_advice():
    memory = psutil.virtual_memory()
    storage = shutil.disk_usage("C:\\")

    total_memory_gb = round(memory.total / (1024**3), 1)
    available_memory_gb = round(memory.available / (1024**3), 1)
    free_storage_gb = round(storage.free / (1024**3), 1)
    storage_free_percent = round((storage.free / storage.total) * 100, 1)

    advice = []

    if total_memory_gb < 8:
        advice.append(
            "A memory upgrade would likely help multitasking, because this computer has a modest amount of memory."
        )
    elif available_memory_gb < 2:
        advice.append(
            "More memory may help if you often keep many browser tabs or apps open at the same time."
        )
    else:
        advice.append(
            "Memory does not look like the first upgrade priority right now."
        )

    if storage_free_percent < 15:
        advice.append(
            "Storage should be a priority because the main drive does not have much free space."
        )
    else:
        advice.append(
            "Storage looks usable right now, so an SSD upgrade is not urgent based only on free space."
        )

    first_priority = "No urgent upgrade is obvious right now."
    if storage_free_percent < 10:
        first_priority = "Storage is the first thing to fix because free space is low."
    elif total_memory_gb < 8 or available_memory_gb < 2:
        first_priority = "Memory is the first upgrade to consider if the computer feels slow during multitasking."

    return {
        "summary": first_priority,
        "memory": {
            "total_gb": total_memory_gb,
            "available_gb": available_memory_gb,
        },
        "storage": {
            "free_gb": free_storage_gb,
            "free_percent": storage_free_percent,
        },
        "advice": advice,
    }


def get_system_diagnostics():
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    storage = shutil.disk_usage("C:\\")
    battery = psutil.sensors_battery()
    top_apps = get_slow_apps(limit=5).get("apps", [])

    total_memory_gb = round(memory.total / (1024**3), 1)
    available_memory_gb = round(memory.available / (1024**3), 1)
    storage_free_percent = round((storage.free / storage.total) * 100, 1)

    issues = []
    next_steps = []

    if cpu_percent >= 85:
        issues.append(
            {
                "issue": "Processor is very busy",
                "detail": "Your computer's processor is working very hard right now, which can make apps feel slow or unresponsive.",
            }
        )
        next_steps.append(
            "Close demanding apps or browser tabs so the processor can focus on the task you care about."
        )
    elif cpu_percent >= 60:
        issues.append(
            {
                "issue": "Processor is moderately busy",
                "detail": "Your processor is doing a lot of work right now, so some apps may feel a bit slow.",
            }
        )

    if available_memory_gb < 2:
        issues.append(
            {
                "issue": "Low available memory",
                "detail": f"Your computer has only about {available_memory_gb} GB of free memory, which can make multitasking slow.",
            }
        )
        next_steps.append(
            "Close unused apps and browser tabs, or consider adding more memory if you often keep many programs open."
        )
    elif available_memory_gb < 4:
        issues.append(
            {
                "issue": "Limited free memory",
                "detail": f"There is only about {available_memory_gb} GB of free memory available right now.",
            }
        )

    if storage_free_percent < 10:
        issues.append(
            {
                "issue": "Low disk space",
                "detail": f"Your main drive is only {storage_free_percent}% free, which can slow down the computer and make apps harder to open.",
            }
        )
        next_steps.append(
            "Free up disk space by deleting or moving large files, or uninstall apps you no longer use."
        )
    elif storage_free_percent < 20:
        issues.append(
            {
                "issue": "Less than ideal free storage",
                "detail": f"Your drive has only {storage_free_percent}% free, so it may feel sluggish when saving files or opening apps.",
            }
        )

    if battery is not None:
        if not battery.power_plugged and battery.percent < 20:
            issues.append(
                {
                    "issue": "Low battery",
                    "detail": f"Your battery is at {round(battery.percent, 1)}% and not plugged in, which can cause the system to slow down to save power.",
                }
            )
            next_steps.append(
                "Plug in your charger to stop the computer from slowing down on battery power."
            )
    else:
        issues.append(
            {
                "issue": "No battery information",
                "detail": "This computer either does not have a battery or Windows is not exposing battery details.",
            }
        )

    if top_apps:
        busy_apps = [app for app in top_apps if app["cpu_percent"] >= 10 or app["memory_mb"] >= 500]
        if busy_apps:
            app_names = [app["name"] for app in busy_apps[:3]]
            issues.append(
                {
                    "issue": "High resource apps running",
                    "detail": f"Apps like {', '.join(app_names)} are using a lot of processor or memory right now.",
                }
            )
            next_steps.append(
                "Close these heavy apps if you do not need them right now."
            )

    if not issues:
        summary = "I don't see any big problems causing your computer to slow down right now."
        plain_english = "Your computer looks okay for everyday tasks. If it still feels slow, the next simple step is to restart and close apps you are not using."
        next_steps = [
            "Restart the computer and close any apps you are not using.",
            "If it still feels slow after that, check back later when you are not running many apps."
        ]
        what_this_means = "Your system is behaving normally, so the slowdown is likely temporary or caused by the apps you are using now."
    else:
        summary = "I found the most likely reasons your computer is feeling slow right now."
        plain_english = "Here are a few things that could be making your computer feel slower than usual, and the easiest steps to fix them."
        what_this_means = "Your computer performance is being affected by one or more resource issues that are easy to address."

    return {
        "summary": summary,
        "plain_english": plain_english,
        "what_this_means": what_this_means,
        "what_to_do_next": next_steps,
        "reasons": issues,
        "top_apps": busy_apps if busy_apps else [],
    }


def get_storage_insights():
    storage = shutil.disk_usage("C:\\")
    free_storage_gb = round(storage.free / (1024**3), 1)
    free_percent = round((storage.free / storage.total) * 100, 1)
    details = []

    if free_percent < 10:
        summary = "Your main drive is very low on space right now."
        details.append(
            "With less than 10% free space, your computer can slow down and apps may have trouble saving files."
        )
        next_steps = [
            "Move large files to another drive or external storage.",
            "Delete old downloads, videos, or apps you do not need."
        ]
    elif free_percent < 20:
        summary = "Your drive is getting crowded."
        details.append(
            f"Only about {free_percent}% of your main drive is free, so the computer may feel a little sluggish."
        )
        next_steps = [
            "Remove files or apps you do not use anymore.",
            "Look at the biggest files in your Documents and Downloads folders."
        ]
    else:
        summary = "Your disk space looks okay right now."
        details.append(
            "You have enough free storage for normal use, but it is good to keep some room available."
        )
        next_steps = [
            "Try not to let your drive get too full, especially below 20% free space."
        ]

    return {
        "summary": summary,
        "free_storage_gb": free_storage_gb,
        "free_percent": free_percent,
        "details": details,
        "what_this_means": " ".join(details),
        "what_to_do_next": next_steps,
        "large_files": get_large_files(limit=5)["files"] if free_percent < 25 else [],
    }


def get_performance_explanation():
    diagnostic = get_system_diagnostics()
    return {
        "summary": diagnostic["summary"],
        "plain_english": diagnostic["plain_english"],
        "what_this_means": diagnostic["what_this_means"],
        "what_to_do_next": diagnostic["what_to_do_next"],
        "reasons": diagnostic["reasons"],
        "top_apps": diagnostic["top_apps"],
    }


def get_app_issue_explanation(app_name=None, required_memory_gb=None, required_storage_gb=None):
    compatibility = get_app_compatibility(app_name, required_memory_gb, required_storage_gb)
    return {
        "summary": compatibility["summary"],
        "plain_english": compatibility["plain_english"],
        "what_this_means": compatibility["plain_english"],
        "what_to_do_next": compatibility["next_steps"],
        "results": compatibility["results"],
        "app_name": compatibility["app_name"],
    }


def get_full_diagnosis(app_name=None, required_memory_gb=None, required_storage_gb=None):
    return {
        "system_info": get_system_info(),
        "performance": get_performance_explanation(),
        "storage": get_storage_insights(),
        "battery": get_battery_health_info(),
        "app_issue": get_app_issue_explanation(app_name, required_memory_gb, required_storage_gb),
    }


def get_app_compatibility(app_name=None, required_memory_gb=None, required_storage_gb=None):
    memory = psutil.virtual_memory()
    storage = shutil.disk_usage("C:\\")

    total_memory_gb = round(memory.total / (1024**3), 1)
    free_storage_gb = round(storage.free / (1024**3), 1)
    results = []
    next_steps = []
    app_label = app_name or "This app"

    if required_memory_gb is not None:
        can_meet_memory = total_memory_gb >= required_memory_gb
        results.append(
            {
                "requirement": "memory",
                "needed_gb": required_memory_gb,
                "your_computer_gb": total_memory_gb,
                "passes": can_meet_memory,
            }
        )
        if not can_meet_memory:
            next_steps.append(
                f"Close other programs and browser tabs, or use a computer with at least {required_memory_gb} GB of RAM."
            )

    if required_storage_gb is not None:
        can_meet_storage = free_storage_gb >= required_storage_gb
        results.append(
            {
                "requirement": "free_storage",
                "needed_gb": required_storage_gb,
                "your_computer_gb": free_storage_gb,
                "passes": can_meet_storage,
            }
        )
        if not can_meet_storage:
            next_steps.append(
                f"Free up at least {required_storage_gb - free_storage_gb:.1f} GB by deleting files or using another drive."
            )

    if not results:
        return {
            "summary": "Please tell me the app's memory or storage requirements so I can check compatibility.",
            "plain_english": "Give me the app's minimum RAM and storage needs to see if your computer can run it.",
            "results": [],
            "next_steps": ["Try the same check again with the app's requirements."],
            "app_name": app_name,
        }

    can_run = all(result["passes"] for result in results)
    if can_run:
        summary = f"{app_label} looks like it can run on this computer based on the numbers you gave me."
        plain_english = f"Your computer has enough memory and free storage space for {app_label}."
        next_steps.append(f"Try opening {app_label} now.")
    else:
        summary = f"{app_label} may not start because your computer does not meet one or more requirements."
        reasons = []
        if required_memory_gb is not None and total_memory_gb < required_memory_gb:
            reasons.append(
                f"You have {total_memory_gb} GB of RAM, but {app_label} needs {required_memory_gb} GB."
            )
        if required_storage_gb is not None and free_storage_gb < required_storage_gb:
            reasons.append(
                f"You have {free_storage_gb} GB free, but {app_label} needs {required_storage_gb} GB."
            )
        plain_english = " ".join(reasons)
        if not next_steps:
            next_steps.append("Check the app's requirements and try again after freeing space or closing other programs.")

    return {
        "summary": summary,
        "plain_english": plain_english,
        "results": results,
        "next_steps": next_steps,
        "app_name": app_name,
        "your_memory_gb": total_memory_gb,
        "your_free_storage_gb": free_storage_gb,
    }


def get_battery_health_info():
    battery = psutil.sensors_battery()
    # Provide quick data if psutil can see the battery at least
    if battery is None:
        psutil_available = False
    else:
        psutil_available = True
        percent = round(battery.percent, 1)
        plugged_in = battery.power_plugged

    # Only attempt the deeper Windows battery report on Windows systems
    if platform.system().lower() != "windows":
        if not psutil_available:
            return {
                "available": False,
                "summary": "I can't read battery details on this computer right now.",
                "plain_english": "This may happen on a desktop PC or if Windows is not exposing battery information."
            }

        note = (
            "I can see the current battery charge, but a full battery health read is only available on Windows."
        )
        if percent < 20 and not plugged_in:
            note = "The battery is low right now. Plug in the charger soon."

        return {
            "available": True,
            "percent": percent,
            "plugged_in": plugged_in,
            "summary": note,
            "plain_english": (
                "Battery health means how much charge your battery can hold compared with when it was new. "
                "On Windows, I can make a report to estimate that better."
            ),
        }

    # Attempt to run powercfg to create a temporary battery report
    design_capacity = None
    full_charge_capacity = None
    cycle_count = None
    report_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".html") as tf:
            report_path = tf.name

        subprocess.run(
            ["powercfg", "/batteryreport", "/output", report_path],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Read the generated report and search for the fields we need
        with open(report_path, "r", encoding="utf-8", errors="ignore") as f:
            html = f.read()

        # Helper to parse numeric values with commas (mWh)
        def parse_mwh(label):
            m = re.search(rf"{label}.*?>([\d,]+)\s*mWh", html, re.IGNORECASE | re.DOTALL)
            if m:
                return int(m.group(1).replace(",", ""))
            return None

        design_capacity = parse_mwh("DESIGN CAPACITY")
        full_charge_capacity = parse_mwh("FULL CHARGE CAPACITY")

        m_cycle = re.search(r"CYCLE COUNT.*?>(\d+)", html, re.IGNORECASE | re.DOTALL)
        if m_cycle:
            cycle_count = int(m_cycle.group(1))

    except Exception as e:
        # Fall back to any existing bundled report in the backend folder
        report_error = str(e)
        try:
            bundled = Path(__file__).parent / "battery-report.html"
            if bundled.exists():
                with open(bundled, "r", encoding="utf-8", errors="ignore") as f:
                    html = f.read()

                def parse_mwh_local(label):
                    m = re.search(rf"{label}.*?>([\d,]+)\s*mWh", html, re.IGNORECASE | re.DOTALL)
                    if m:
                        return int(m.group(1).replace(",", ""))
                    return None

                design_capacity = parse_mwh_local("DESIGN CAPACITY")
                full_charge_capacity = parse_mwh_local("FULL CHARGE CAPACITY")
                m_cycle = re.search(r"CYCLE COUNT.*?>(\d+)", html, re.IGNORECASE | re.DOTALL)
                if m_cycle:
                    cycle_count = int(m_cycle.group(1))
        except Exception:
            pass
    finally:
        # Clean up temporary report if one was created
        try:
            if report_path and Path(report_path).exists():
                Path(report_path).unlink()
        except Exception:
            pass

    # If we obtained capacities, compute health
    if design_capacity and full_charge_capacity:
        health_percent = round((full_charge_capacity / design_capacity) * 100, 1)
        wear_percent = round(100.0 - health_percent, 1)

        if health_percent >= 90:
            health_note = f"Battery health is excellent — approximately {health_percent}% of original capacity remains."
        elif health_percent >= 70:
            health_note = f"Battery shows moderate wear — about {health_percent}% of original capacity remains."
        else:
            health_note = f"Battery is significantly worn — about {health_percent}% of original capacity remains and replacement may be considered."

        plain = (
            f"Design capacity: {design_capacity:,} mWh. Full charge capacity: {full_charge_capacity:,} mWh. "
            f"Estimated health: {health_percent}% (wear {wear_percent}%)."
        )
        if cycle_count is not None:
            plain += f" Cycle count: {cycle_count}."

        result = {
            "available": True,
            "design_capacity_mwh": design_capacity,
            "full_charge_capacity_mwh": full_charge_capacity,
            "health_percent": health_percent,
            "wear_percent": wear_percent,
            "cycle_count": cycle_count,
            "summary": health_note,
            "plain_english": plain,
        }
        # include psutil snapshot if available
        if psutil_available:
            result.update({"percent": percent, "plugged_in": plugged_in})

        return result

    # If capacities aren't available, fall back to psutil-level info
    if psutil_available:
        note = (
            "I can see the current battery level, but couldn't parse a Windows battery report to estimate long-term health."
        )
        if percent < 20 and not plugged_in:
            note = "The battery is low right now. Plug in the charger soon."

        result = {
            "available": True,
            "percent": percent,
            "plugged_in": plugged_in,
            "summary": note,
            "plain_english": (
                "True battery health means how much charge the battery can still hold compared with when it was new. "
                "On Windows, try running AI Advisor with administrator rights if the report generation failed."
            ),
        }
        # include any report error message for debugging
        if 'report_error' in locals():
            result['report_error'] = report_error
        return result

    return {
        "available": False,
        "summary": "Battery information is not available on this computer.",
        "plain_english": "This may happen on a desktop PC or if Windows does not expose battery data here.",
    }


def get_security_check():
    return {
        "summary": "AI Advisor cannot confirm whether this computer has a virus yet.",
        "plain_english": (
            "Right now, this app can notice performance symptoms like high processor, low memory, or low storage. "
            "It cannot scan for malware. For virus checks, use Windows Security or a trusted antivirus tool."
        ),
        "safe_next_steps": [
            "Run a full scan in Windows Security.",
            "Avoid opening unknown downloads or email attachments.",
            "Tell AI Advisor if the computer is slow even when no heavy apps are open.",
        ],
    }


def get_large_files(limit=25):
    search_roots = [
        Path.home() / "Desktop",
        Path.home() / "Downloads",
        Path.home() / "Documents",
        Path.home() / "Pictures",
        Path.home() / "Videos",
    ]
    files = []

    for root in search_roots:
        if not root.exists():
            continue

        for current_root, _, file_names in os.walk(root):
            for file_name in file_names:
                file_path = Path(current_root) / file_name
                try:
                    size_bytes = file_path.stat().st_size
                except (OSError, PermissionError):
                    continue

                files.append(
                    {
                        "name": file_path.name,
                        "path": str(file_path),
                        "size_mb": round(size_bytes / (1024**2), 1),
                    }
                )

    largest_files = sorted(files, key=lambda item: item["size_mb"], reverse=True)[:limit]
    largest_files_in_increasing_order = sorted(
        largest_files, key=lambda item: item["size_mb"]
    )

    return {
        "summary": "These are the largest files I found in common user folders, sorted from smaller to larger.",
        "searched_folders": [str(root) for root in search_roots],
        "files": largest_files_in_increasing_order,
    }


def check_software_requirements(required_memory_gb=None, required_storage_gb=None):
    memory = psutil.virtual_memory()
    storage = shutil.disk_usage("C:\\")

    total_memory_gb = round(memory.total / (1024**3), 1)
    free_storage_gb = round(storage.free / (1024**3), 1)
    results = []

    if required_memory_gb is not None:
        can_meet_memory = total_memory_gb >= required_memory_gb
        results.append(
            {
                "requirement": "memory",
                "needed_gb": required_memory_gb,
                "your_computer_gb": total_memory_gb,
                "passes": can_meet_memory,
            }
        )

    if required_storage_gb is not None:
        can_meet_storage = free_storage_gb >= required_storage_gb
        results.append(
            {
                "requirement": "free_storage",
                "needed_gb": required_storage_gb,
                "your_computer_gb": free_storage_gb,
                "passes": can_meet_storage,
            }
        )

    if not results:
        return {
            "summary": "Tell me the software's needed memory or storage, and I can compare it with this computer.",
            "results": [],
        }

    can_run = all(result["passes"] for result in results)
    summary = "This computer meets the basic memory and storage requirements you entered."
    if not can_run:
        summary = "This computer may not meet the basic memory or storage requirements you entered."

    return {
        "summary": summary,
        "results": results,
        "plain_english": (
            "This is a simple check. Games and heavy apps also depend on graphics hardware, which we have not added yet."
        ),
    }


def get_startup_insights():
    """Return a beginner-friendly summary of startup items (Windows only).

    This checks common Registry Run keys and the user/common Startup folders.
    """
    if platform.system().lower() != "windows":
        return {
            "available": False,
            "summary": "Startup item details are only available on Windows.",
            "plain_english": (
                "I can check which programs start automatically on Windows. "
                "On macOS or Linux, startup mechanisms differ — tell me if you want those."
            ),
        }

    startup_entries = []
    try:
        import winreg

        keys = [
            (winreg.HKEY_CURRENT_USER, r"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"),
        ]

        for hive, key_path in keys:
            try:
                with winreg.OpenKey(hive, key_path) as k:
                    i = 0
                    while True:
                        try:
                            name, val, _ = winreg.EnumValue(k, i)
                            startup_entries.append({"source": key_path, "name": name, "command": val})
                            i += 1
                        except OSError:
                            break
            except FileNotFoundError:
                continue
    except Exception:
        # If winreg not available or access denied, fall back to no entries
        pass

    # Check Start Menu Startup folders
    try:
        user_start = Path(os.environ.get("APPDATA", "")) / r"Microsoft\\Windows\\Start Menu\\Programs\\Startup"
        common_start = Path(os.environ.get("PROGRAMDATA", "")) / r"Microsoft\\Windows\\Start Menu\\Programs\\Startup"
        for folder in (user_start, common_start):
            if folder.exists():
                for f in folder.iterdir():
                    try:
                        startup_entries.append({"source": str(folder), "name": f.name, "command": str(f)})
                    except Exception:
                        continue
    except Exception:
        pass

    summary = "I found a few programs set to start automatically." if startup_entries else "I did not find startup items in common places."
    plain = (
        "Programs that start automatically can make your computer take longer to become responsive after a restart. "
        "If you don't need a program right away, removing it from startup can speed things up."
    )

    # Keep the output small for non-technical users
    brief = []
    for entry in startup_entries[:8]:
        brief.append({"source": entry.get("source"), "name": entry.get("name")})

    return {
        "available": True,
        "summary": summary,
        "plain_english": plain,
        "sample_items": brief,
        "count": len(startup_entries),
    }


def get_suspicious_processes(limit=10):
    """Return processes that may warrant attention with conservative heuristics."""
    suspicious = []
    processes = []

    for proc in psutil.process_iter(["pid", "name"]):
        try:
            proc.cpu_percent(interval=None)
            processes.append(proc)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    time.sleep(0.3)

    for proc in processes:
        try:
            name = proc.name() or "<unknown>"
            pid = proc.pid
            cpu = round(proc.cpu_percent(interval=None), 1)
            mem_mb = round(proc.memory_info().rss / (1024**2), 1)
            exe = None
            reason = []
            try:
                exe = proc.exe()
                exe_lower = exe.lower()
                if "\\temp\\" in exe_lower or "downloads" in exe_lower:
                    reason.append("Running from a temporary or downloads folder")
            except (psutil.AccessDenied, psutil.NoSuchProcess, FileNotFoundError):
                exe = None

            # Heuristic flags
            if cpu >= 30:
                reason.append(f"High CPU usage ({cpu}%)")
            if mem_mb >= 500:
                reason.append(f"High memory use ({mem_mb} MB)")

            if reason:
                suspicious.append({
                    "pid": pid,
                    "name": name,
                    "cpu_percent": cpu,
                    "memory_mb": mem_mb,
                    "exe": exe,
                    "reasons": reason,
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    suspicious.sort(key=lambda x: (x["cpu_percent"], x["memory_mb"]), reverse=True)
    return {
        "summary": "These processes may deserve attention.",
        "plain_english": (
            "I use simple checks like high CPU/memory and where the program is running from. "
            "If you don't recognize a process or it's using lots of resources, consider closing it."
        ),
        "processes": suspicious[:limit],
    }


def get_thermal_status():
    """Try to read temperature sensors; fall back to Windows WMIC if needed."""
    temps = {}
    try:
        # psutil may not have sensors_temperatures in some builds
        if hasattr(psutil, "sensors_temperatures"):
            raw = psutil.sensors_temperatures()
            for name, entries in (raw or {}).items():
                temps[name] = [
                    {"label": e.label, "current_c": round(e.current, 1)} for e in entries[:5]
                ]
    except Exception:
        temps = {}

    # If psutil returned values, present them
    if temps:
        return {
            "available": True,
            "summary": "Temperature sensors are available on this machine.",
            "plain_english": "The temperatures below show current sensor readings in Celsius.",
            "sensors": temps,
        }

    # Try WMIC fallback on Windows
    if platform.system().lower() == "windows":
        try:
            res = subprocess.run(
                ["wmic", "/namespace:\\root\\wmi", "PATH", "MSAcpi_ThermalZoneTemperature", "get", "CurrentTemperature"],
                capture_output=True,
                text=True,
                check=True,
            )
            lines = [l.strip() for l in res.stdout.splitlines() if l.strip()]
            temps_list = []
            for line in lines:
                if line.isdigit():
                    # value is in tenths of Kelvin
                    c = int(line) / 10.0 - 273.15
                    temps_list.append(round(c, 1))
            if temps_list:
                return {
                    "available": True,
                    "summary": "Thermal readings available via WMIC.",
                    "plain_english": "Temperatures are best-effort values from Windows sensors.",
                    "temperatures_c": temps_list,
                }
        except Exception:
            pass

    return {
        "available": False,
        "summary": "Temperature sensors are not available.",
        "plain_english": (
            "I couldn't find temperature readings. Some machines or Python installs don't expose sensor data. "
            "You can use vendor tools (Dell/HP) or OpenHardwareMonitor for detailed thermal info."
        ),
    }
