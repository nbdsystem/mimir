FROM nginx:latest

RUN apt-get update \
  && apt-get install --no-install-recommends --no-install-suggests -y ca-certificates openssl

# Generate SSL certs for development
COPY setup.sh .
RUN ./setup.sh
RUN rm setup.sh

WORKDIR /etc/nginx

COPY nginx.conf .
COPY sites-enabled sites-enabled/

CMD ["nginx", "-g", "daemon off;"]
