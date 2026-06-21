# AI Advisor Backend

FastAPI backend for AI Advisor.

## Setup

Create a virtual environment:

```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" -m venv venv
```

Install dependencies:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Run

Start the backend server:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

Open:

```text
http://127.0.0.1:8000/
```

System scan endpoint:

```text
http://127.0.0.1:8000/system-info
```
