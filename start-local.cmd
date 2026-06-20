@echo off
cd /d "%~dp0"
"C:\Users\Klaus-HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "%~dp0server.mjs" 1>>"%~dp0server.out.log" 2>>"%~dp0server.err.log"
