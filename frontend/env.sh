#!/bin/sh
# Runtime environment injection — generates /usr/share/nginx/html/env.js
# at container startup so the API base URL can be configured without rebuilding.

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL}"
};
EOF
