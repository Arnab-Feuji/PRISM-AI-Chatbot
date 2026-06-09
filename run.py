#!/usr/bin/env python3
"""
PRISM — Single Entry-Point Launcher
Usage: python run.py

Starts:
  - FastAPI backend  on http://localhost:8000
  - React patient UI on http://localhost:5173 (npm run dev)
  - React admin  UI  on http://localhost:5174 (npm run admin)
"""
import subprocess, sys, os, time, signal, threading, urllib.request
from pathlib import Path

ROOT    = Path(__file__).parent
BACKEND = ROOT / "backend"
FRONTEND= ROOT / "frontend"
VENV_PY = ROOT / ".venv" / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
PYTHON  = str(VENV_PY) if VENV_PY.exists() else sys.executable

# Ports PRISM expects — stale dev servers often leave these occupied
PRISM_PORTS = [8000, 5177, 5178]

processes = []

# On Windows, isolate child processes so uvicorn reload events do not
# propagate Ctrl+C / console signals to this launcher process.
if sys.platform == "win32":
    SUBPROCESS_FLAGS = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
else:
    SUBPROCESS_FLAGS = 0


def popen_kwargs():
    kwargs = {}
    if SUBPROCESS_FLAGS:
        kwargs["creationflags"] = SUBPROCESS_FLAGS
    return kwargs


def _pids_on_port(port: int) -> set:
    """Return PIDs listening on a TCP port (Windows)."""
    pids = set()
    if sys.platform == "win32":
        try:
            out = subprocess.run(
                [
                    "powershell", "-NoProfile", "-Command",
                    f"(Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue).OwningProcess",
                ],
                capture_output=True, text=True, check=False,
            )
            for line in out.stdout.splitlines():
                line = line.strip()
                if line.isdigit():
                    pids.add(line)
            if pids:
                return pids
        except Exception:
            pass
    try:
        out = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True, check=False, shell=True,
        )
        needle = f":{port} "
        for line in out.stdout.splitlines():
            if "LISTENING" in line and needle in line:
                parts = line.split()
                if parts and parts[-1].isdigit():
                    pids.add(parts[-1])
    except Exception:
        pass
    return pids


def _kill_orphan_uvicorn_workers():
    """Kill orphaned uvicorn multiprocessing workers left after parent exit."""
    if sys.platform != "win32":
        return
    try:
        out = subprocess.run(
            [
                "powershell", "-NoProfile", "-Command",
                "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | "
                "Where-Object { $_.CommandLine -match 'spawn_main|uvicorn|backend.main' } | "
                "Select-Object -ExpandProperty ProcessId",
            ],
            capture_output=True, text=True, check=False,
        )
        own_pid = str(os.getpid())
        for line in out.stdout.splitlines():
            proc_id = line.strip()
            if proc_id.isdigit() and proc_id != own_pid:
                subprocess.run(
                    ["taskkill", "/F", "/PID", proc_id],
                    capture_output=True, check=False, shell=True,
                )
    except Exception:
        pass


def free_prism_ports():
    """Stop leftover PRISM dev processes so ports 8000/5177/5178 are available."""
    own_pid = str(os.getpid())
    killed = []
    for port in PRISM_PORTS:
        for pid in _pids_on_port(port):
            if pid == own_pid:
                continue
            try:
                subprocess.run(
                    ["taskkill", "/F", "/PID", pid, "/T"],
                    capture_output=True, check=False, shell=True,
                )
                killed.append((port, pid))
            except Exception:
                pass
    _kill_orphan_uvicorn_workers()
    if killed:
        print("[CLEANUP] Freed stale ports:")
        for port, pid in killed:
            print(f"   port {port}  (pid {pid})")
        time.sleep(1.5)


def wait_for_backend(timeout: float = 90) -> bool:
    """Poll /api/health until backend startup completes."""
    url = "http://127.0.0.1:8000/api/health"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=3) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False

def print_banner():
    print("""
+----------------------------------------------------------+
|   PRISM -- Patient-centric Retrieval Intelligence System |
|   Version 2.0 | Feuji AI/ML Data Science Team            |
+----------------------------------------------------------+
|   Backend API:    http://localhost:8000                  |
|   API Docs:       http://localhost:8000/docs             |
|   Patient App:    http://localhost:5177                  |
|   Admin Portal:   http://localhost:5178                |
+----------------------------------------------------------+
""")

def stream_output(proc, prefix, color):
    colors = {"backend": "\033[36m", "patient": "\033[32m", "admin": "\033[35m"}
    c = colors.get(prefix, "")
    reset = "\033[0m"
    for line in iter(proc.stdout.readline, b''):
        try:
            print(f"{c}[{prefix}]{reset} {line.decode().rstrip()}")
        except Exception:
            pass

def check_env():
    env_file = ROOT / ".env"
    if not env_file.exists():
        print("[WARN] .env not found. Copying from .env.example...")
        import shutil
        shutil.copy(ROOT / ".env.example", env_file)
        print("   Edit .env and add your ANTHROPIC_API_KEY before using the chat.")

def check_node():
    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True, shell=True)
        subprocess.run(["npm", "--version"], capture_output=True, check=True, shell=True)
        return True
    except FileNotFoundError:
        print("[ERROR] Node.js/npm not found. Install Node.js from https://nodejs.org and ensure npm is on PATH.")
        return False
    except Exception as e:
        print(f"[ERROR] Node.js/npm check failed: {e}")
        return False

def check_python_deps():
    try:
        subprocess.run(
            [PYTHON, "-c", "import fastapi, uvicorn, langchain"],
            check=True, capture_output=True,
        )
        return True
    except (ImportError, subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"[WARN] Missing Python deps: {e}")
        print(f"   Run: {PYTHON} -m pip install -r backend/requirements.txt")
        return False

def install_frontend():
    nm = FRONTEND / "node_modules"
    if not nm.exists():
        print("[INSTALL] Installing frontend dependencies...")
        try:
            subprocess.run(["npm", "install"], cwd=FRONTEND, check=True, shell=True)
            print("[SUCCESS] Frontend deps installed")
        except FileNotFoundError:
            print("[ERROR] npm not found. Skipping frontend dependency install.")
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] Failed to install frontend dependencies: {e}")


def start_backend():
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT)

    cmd = [
        PYTHON, "-m", "uvicorn", "backend.main:app",
        "--host", "127.0.0.1", "--port", "8000",
    ]
    # Run from backend/ so uvicorn's file watcher only sees backend code.
    # (When cwd is the repo root, uvicorn also watches .venv and OneDrive sync
    # touches those files, causing endless reloads and killing the launcher.)
    if os.environ.get("PRISM_NO_RELOAD", "").lower() not in {"1", "true", "yes"}:
        cmd.append("--reload")
        cmd.extend(["--reload-dir", str(ROOT / "backend")])

    proc = subprocess.Popen(
        cmd,
        cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env,
        **popen_kwargs(),
    )
    processes.append(proc)
    t = threading.Thread(target=stream_output, args=(proc, "backend", "cyan"), daemon=True)
    t.start()
    return proc

def start_patient():
    env = os.environ.copy()
    # Increase header size to handle large metadata in dev session
    env["NODE_OPTIONS"] = "--max-http-header-size=64000"
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, env=env,
        **popen_kwargs(),
    )
    processes.append(proc)
    t = threading.Thread(target=stream_output, args=(proc, "patient", "green"), daemon=True)
    t.start()
    return proc

def start_admin():
    env = os.environ.copy()
    env["NODE_OPTIONS"] = "--max-http-header-size=64000"
    proc = subprocess.Popen(
        ["npm", "run", "admin"],
        cwd=FRONTEND, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, env=env,
        **popen_kwargs(),
    )
    processes.append(proc)
    t = threading.Thread(target=stream_output, args=(proc, "admin", "magenta"), daemon=True)
    t.start()
    return proc

def shutdown(sig, frame):
    print("\n\n[STOP] Shutting down PRISM...")
    for p in processes:
        try: p.terminate()
        except Exception: pass
    sys.exit(0)

def main():
    signal.signal(signal.SIGINT,  shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print_banner()
    check_env()

    if not check_python_deps():
        print("Install Python deps first and retry.")

    if check_node():
        install_frontend()

    print("[START] Starting PRISM services...\n")

    free_prism_ports()

    # Backend
    print("[RUN] Starting FastAPI backend on :8000...")
    start_backend()
    if wait_for_backend():
        print("[RUN] Backend health check OK")
    else:
        print("[WARN] Backend not responding yet — check PostgreSQL and logs above")

    # Frontend
    if check_node():
        print("[RUN] Starting Patient UI on :5177...")
        start_patient()
        time.sleep(1)
        print("[RUN] Starting Admin Portal on :5178...")
        start_admin()

    print("\n[SUCCESS] All services started! Press Ctrl+C to stop.\n")

    # Keep alive
    try:
        while True:
            time.sleep(1)
            # Check if backend crashed
            if processes and processes[0].poll() is not None:
                print("[ERROR] Backend crashed. Restarting...")
                processes.pop(0)
                start_backend()
    except KeyboardInterrupt:
        shutdown(None, None)


if __name__ == "__main__":
    main()
