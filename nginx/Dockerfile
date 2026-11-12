FROM nginx:1.30.5-alpine
# Rendered to /etc/nginx/conf.d/default.conf with ${DOMAIN} filled in when the container starts
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY 40-reload-certificates.sh /docker-entrypoint.d/40-reload-certificates.sh
RUN chmod +x /docker-entrypoint.d/40-reload-certificates.sh
