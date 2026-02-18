#!/bin/sh
set -e

echo "🟢 Container entrypoint started (Node + serve)"

: "${BACKEND_URL:?Missing BACKEND_URL environment variable}"

# Default DEBUG_AUTH to false if not set
DEBUG_AUTH="${DEBUG_AUTH:-false}"

CONFIG_PATH="/app/dist/config.js"

echo "🟢 Writing runtime config to $CONFIG_PATH"

cat <<EOF > $CONFIG_PATH
window.RUNTIME_CONFIG = {
  BACKEND_URL: "${BACKEND_URL}",
  DEBUG_AUTH: ${DEBUG_AUTH}
};

console.info("[config.js] Injected RUNTIME_CONFIG", window.RUNTIME_CONFIG);
EOF

echo "🟢 Final config.js:"
cat $CONFIG_PATH

echo "🟢 Starting static server on port 3000"
exec serve -s dist -l 3000
