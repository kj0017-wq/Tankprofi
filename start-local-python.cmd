@echo off
cd /d "%~dp0"
start "" /b "C:\Users\Klaus-HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" "%~dp0server.py" 1>>"%~dp0python-server.out.log" 2>>"%~dp0python-server.err.log"
