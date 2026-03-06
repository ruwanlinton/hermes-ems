#!/bin/sh
# Runtime environment injection for Choreo
# This script generates /usr/share/nginx/html/env.js at container startup
# referencing actual runtime environment variables.

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_ASGARDEO_CLIENT_ID: "${VITE_ASGARDEO_CLIENT_ID}",
  VITE_ASGARDEO_BASE_URL: "${VITE_ASGARDEO_BASE_URL}",
  VITE_API_BASE_URL: "${VITE_API_BASE_URL}"
};
EOF
