FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY TravelLogik.html /usr/share/nginx/html/TravelLogik.html
COPY index-ionos-flat.html /usr/share/nginx/html/index-ionos-flat.html
COPY modules /usr/share/nginx/html/modules

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
