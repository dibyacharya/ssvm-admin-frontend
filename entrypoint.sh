#!/bin/sh
set -e

echo "🟢 Container entrypoint started (Node + serve)"

: "${REACT_APP_BACKEND_URL:?Missing REACT_APP_BACKEND_URL}"

CONFIG_PATH="/app/dist/config.js"

echo "🟢 Writing runtime config to $CONFIG_PATH"

cat <<EOF > $CONFIG_PATH
window.RUNTIME_CONFIG = {
  BACKEND_URL: "${REACT_APP_BACKEND_URL}",
  DEBUG_AUTH: false
};

console.info("[config.js] Injected RUNTIME_CONFIG", window.RUNTIME_CONFIG);
EOF

echo "🟢 Final config.js:"
cat $CONFIG_PATH

echo "🟢 Starting static server on port 3000"
exec serve -s dist -l 3000
