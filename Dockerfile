FROM ubuntu:14.04

# update and install nginx and supervisor
RUN apt-get update -y && apt-get install --no-install-recommends -y -q curl python build-essential git ca-certificates nginx-extras supervisor

# update and install node
RUN apt-get install --yes curl
RUN curl --silent --location https://deb.nodesource.com/setup_4.x | sudo bash -
RUN apt-get install --yes nodejs
RUN apt-get install --yes build-essential

RUN mkdir -p /etc/nginx/conf.d
COPY  ./Nginx/managementAPI.conf /etc/nginx/conf.d
COPY  ./Nginx/nginx.conf /etc/nginx/
COPY  ./Nginx/.htpasswd /etc/nginx
COPY  ./Nginx/mobileo2.com.chained.crt /etc/ssl
COPY  ./Nginx/mobileo2.com.key /etc/ssl
COPY  ./Nginx/dhparams.pem /etc/ssl
COPY  ./Nginx/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

WORKDIR /app
COPY . /app
RUN npm install

EXPOSE  80 443 
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
