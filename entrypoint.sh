#!/bin/sh

ASSETS_DIR=/app/dist/assets

find $ASSETS_DIR -type f -name "*.js" -print0 | while IFS= read -r -d $'\0' file; do
  echo "Processing $file ..."
  # Replace placeholders with actual environment variable values
  sed -i "s|__VITE_API_URL__|${VITE_API_URL}|g" "$file"
  sed -i "s|__VITE_API_VERSION__|${VITE_API_VERSION}|g" "$file"
  sed -i "s|__VITE_ADMIN_EMAIL__|${VITE_ADMIN_EMAIL}|g" "$file"
  sed -i "s|__VITE_GOOGLE_PROJECT_ID__|${VITE_GOOGLE_PROJECT_ID}|g" "$file"
  sed -i "s|__VITE_GOOGLE_CLIENT_ID__|${VITE_GOOGLE_CLIENT_ID}|g" "$file"
  sed -i "s|__VITE_GOOGLE_REDIRECT_URI__|${VITE_GOOGLE_REDIRECT_URI}|g" "$file"
  sed -i "s|__VITE_IS_SERVICE_ACCOUNT__|${VITE_IS_SERVICE_ACCOUNT}|g" "$file"
  sed -i "s|__VITE_FEATURE_REQUEST_ACCESS__|${VITE_FEATURE_REQUEST_ACCESS}|g" "$file"
done

# ---------------------------------------------------------------------------
# Deployment stamp (client auto-reload after a redeploy)
#
# The JS above was just rewritten with this deployment's env values, but its
# filename hash was computed at build time - so a config-only redeploy would
# otherwise keep serving "new" content under an old, long-cached URL.
#
# DEPLOY_ID = <build time>-<hash of the injected env values>. It is
# deterministic for a given image + config, so every Cloud Run instance of a
# revision reports the same id, and it changes whenever the code OR the
# injected config changes. It is used to:
#   1. stamp index.html (<meta name="app-deploy-id">) for the running client,
#   2. cache-bust the rewritten entry JS/CSS (?v=DEPLOY_ID),
#   3. publish dist/version.json, which open clients poll to detect a redeploy.
# ---------------------------------------------------------------------------
DIST_DIR=/app/dist
BUILD_TIME=$(sed -n 's/.*"buildTime":"\([0-9]*\)".*/\1/p' "$DIST_DIR/version.json" 2>/dev/null)
[ -z "$BUILD_TIME" ] && BUILD_TIME=$(date +%s)000
ENV_HASH=$(printf '%s|' \
  "$VITE_API_URL" "$VITE_API_VERSION" "$VITE_ADMIN_EMAIL" "$VITE_GOOGLE_PROJECT_ID" \
  "$VITE_GOOGLE_CLIENT_ID" "$VITE_GOOGLE_REDIRECT_URI" "$VITE_IS_SERVICE_ACCOUNT" \
  "$VITE_FEATURE_REQUEST_ACCESS" | sha1sum | cut -c1-12)
DEPLOY_ID="${BUILD_TIME}-${ENV_HASH}"

sed -i "s|__APP_DEPLOY_ID__|${DEPLOY_ID}|g" "$DIST_DIR/index.html"
# Only matches URLs not already carrying a query string, so this is idempotent.
sed -i -E "s#(/assets/[^\"?]+\.(js|css))\"#\1?v=${DEPLOY_ID}\"#g" "$DIST_DIR/index.html"
printf '{"buildTime":"%s","deployId":"%s"}\n' "$BUILD_TIME" "$DEPLOY_ID" > "$DIST_DIR/version.json"
echo "Deployment id: ${DEPLOY_ID}"

# Start the Node (Express) server, which serves the API and the built frontend
echo "env setup done and run npm"
npm start