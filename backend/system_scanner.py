import os
import shutil
import time
from pathlib import Path

import psutil


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
        "battery": battery_info,
        "recommendations": recommendations,
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


def get_battery_health_info():
    battery = psutil.sensors_battery()

    if battery is None:
        return {
            "available": False,
            "summary": "Battery information is not available on this computer.",
            "plain_english": "This may happen on a desktop PC or if Windows does not expose battery data here.",
        }

    percent = round(battery.percent, 1)
    plugged_in = battery.power_plugged

    note = (
        "I can see the current battery level, but not the long-term battery health yet."
    )
    if percent < 20 and not plugged_in:
        note = "The battery is low right now. Plug in the charger soon."

    return {
        "available": True,
        "percent": percent,
        "plugged_in": plugged_in,
        "summary": note,
        "plain_english": (
            "True battery health means how much charge the battery can still hold compared with when it was new. "
            "That needs a deeper Windows battery report, which we can add later."
        ),
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
