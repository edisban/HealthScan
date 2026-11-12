#!/bin/sh
# Runs in the certbot container. Keeps a certificate for nginx at /etc/letsencrypt/active/.
#
# 1. Creates a temporary self-signed certificate, so nginx can start before Let's Encrypt answers.
# 2. With a real DOMAIN, gets a Let's Encrypt certificate through nginx (webroot), copies it into
#    place, and checks for renewal every 12 hours. nginx reloads every 6 hours to pick it up.
set -eu

DOMAIN="${DOMAIN:-localhost}"
ACTIVE=/etc/letsencrypt/active
mkdir -p "$ACTIVE"

if [ ! -f "$ACTIVE/fullchain.pem" ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 30 -subj "/CN=$DOMAIN" \
    -keyout "$ACTIVE/privkey.pem" -out "$ACTIVE/fullchain.pem" 2>/dev/null
  echo "Temporary self-signed certificate created for $DOMAIN"
fi

if [ "$DOMAIN" = "localhost" ]; then
  echo "DOMAIN is localhost: keeping the self-signed certificate (testing only)"
  exec sleep infinity
fi

if [ -n "${LETSENCRYPT_EMAIL:-}" ]; then
  ACCOUNT="--email $LETSENCRYPT_EMAIL"
else
  ACCOUNT="--register-unsafely-without-email"
fi

# Give nginx a moment to start serving the domain check
sleep 10
while :; do
  # shellcheck disable=SC2086
  certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" $ACCOUNT \
    --agree-tos --non-interactive --keep-until-expiring || echo "Certificate request failed; retrying later"
  if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    cp -L "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$ACTIVE/fullchain.pem"
    cp -L "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$ACTIVE/privkey.pem"
  fi
  sleep 12h
done
