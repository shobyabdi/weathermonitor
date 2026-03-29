#!/usr/bin/env bash
# Weather Intelligence Dashboard — local launcher
# Usage: bash start.sh
set -e

# Load .env if present
if [ -f .env ]; then
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

# Set up Python virtual environment
VENV_DIR=".venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "Creating Python virtual environment..."
  python3.13 -m venv "$VENV_DIR"
fi

# Activate venv
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# Install Python deps if needed
if ! python3 -c "import fastapi, uvicorn" 2>/dev/null; then
  echo "Installing Python dependencies..."
  pip3 install -r requirements.txt
fi

# Check Node deps
if [ ! -d node_modules ]; then
  echo "Installing Node dependencies..."
  npm install
fi

echo ""
echo "Starting Weather Intelligence backend on :8000..."
cd backend
python3 -m uvicorn api.server:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Give the backend a moment to start
sleep 2

echo "Starting Weather Intelligence frontend on :5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Weather Intelligence Dashboard          ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Dashboard : http://localhost:5173        ║"
echo "║  API       : http://localhost:8000        ║"
echo "║  API docs  : http://localhost:8000/docs   ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop."

cleanup() {
  echo ""
  echo "Stopping servers..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}

trap cleanup INT TERM
wait
