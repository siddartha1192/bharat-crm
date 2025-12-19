#!/bin/bash

# Script to generate self-signed SSL certificate for development/testing
# For production, use Let's Encrypt instead

echo "🔐 Generating self-signed SSL certificate for climcrm.com"
echo ""

# Create ssl directory if it doesn't exist
mkdir -p nginx/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=IN/ST=State/L=City/O=Organization/OU=IT/CN=climcrm.com" \
  -addext "subjectAltName=DNS:climcrm.com,DNS:www.climcrm.com"

echo ""
echo "✅ Self-signed SSL certificate generated!"
echo "   Certificate: nginx/ssl/cert.pem"
echo "   Private Key: nginx/ssl/key.pem"
echo ""
echo "⚠️  This is a SELF-SIGNED certificate for testing only."
echo "   Browsers will show a security warning."
echo "   For production, use Let's Encrypt or a proper CA certificate."
echo ""
