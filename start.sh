#!/bin/bash
cd "$(dirname "$0")"

echo "Starting Finding Love Malawi..."

# Kill any existing processes
pkill -f "node.*server/index.js" 2>/dev/null
pkill -f "vite.*3000" 2>/dev/null
sleep 1

# Start backend with setsid so it survives
setsid bash -c 'cd '"$(pwd)"'/server && exec node index.js >> /tmp/flm-server.log 2>&1' &
sleep 2

# Start frontend with setsid so it survives
setsid bash -c 'cd '"$(pwd)"'/client && exec node node_modules/.bin/vite --host 0.0.0.0 --port 3000 >> /tmp/flm-vite.log 2>&1' &
sleep 3

echo ""
echo "==================================="
echo "  Finding Love Malawi is running!  "
echo "==================================="
echo "  Frontend: http://localhost:3000  "
echo "  Backend:  http://localhost:5000  "
echo "==================================="
echo ""
echo "  Logs: /tmp/flm-server.log, /tmp/flm-vite.log"
