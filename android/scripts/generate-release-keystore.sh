#!/usr/bin/env bash
#
# Helper script to generate a production Android release keystore and output Base64 for GitHub Secrets.
# Run: bash generate-release-keystore.sh
#

set -e

KEYSTORE_NAME="clapfinder-release.jks"
KEY_ALIAS="clapfinder"
VALIDITY_DAYS=10000

echo "=========================================================="
echo "  Clap Finder - Production Release Keystore Generator     "
echo "=========================================================="
echo ""
echo "Creating keystore: $KEYSTORE_NAME with alias '$KEY_ALIAS' (valid for $VALIDITY_DAYS days)..."
echo "You will be prompted to enter a password and organization details."
echo ""

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_NAME" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS" \
  -deststoretype JKS

echo ""
echo "✅ Keystore created successfully: $KEYSTORE_NAME"
echo ""
echo "----------------------------------------------------------"
echo "  GitHub Actions Secrets Configuration Guide              "
echo "----------------------------------------------------------"
echo "Go to your GitHub Repository > Settings > Secrets and variables > Actions > New repository secret:"
echo ""
echo "1. KEYSTORE_BASE64: (Copy the Base64 string below)"

if command -v base64 >/dev/null 2>&1; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    base64 -i "$KEYSTORE_NAME" | tr -d '\n' > "$KEYSTORE_NAME.base64.txt"
  else
    base64 -w 0 "$KEYSTORE_NAME" > "$KEYSTORE_NAME.base64.txt"
  fi
  echo "   [Base64 exported to file: $KEYSTORE_NAME.base64.txt]"
  echo "   Preview: $(head -c 60 "$KEYSTORE_NAME.base64.txt")...[truncated]"
else
  echo "   Run: base64 -w 0 $KEYSTORE_NAME > keystore.base64.txt"
fi

echo ""
echo "2. KEYSTORE_PASSWORD: The password you entered above"
echo "3. KEY_ALIAS: $KEY_ALIAS"
echo "4. KEY_PASSWORD: The key password you entered above"
echo "----------------------------------------------------------"
