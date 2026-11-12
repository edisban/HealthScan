#!/bin/sh
# Run by the nginx image before nginx starts. Reloads nginx every 6 hours in the background,
# so a certificate renewed by the certbot container is picked up without a restart.
(
  while :; do
    sleep 6h
    nginx -s reload
  done
) &
