# FROM node:latest as builder
# WORKDIR /app
# COPY . .
FROM ubuntu:latest

RUN apt-get -y update
RUN apt-get -y install git curl fio
RUN curl -fsSL https://deb.nodesource.com/setup_19.x | bash - &&\
apt-get install -y nodejs
RUN curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash - &&\
apt-get install -y speedtest
RUN curl -s https://packagecloud.io/install/repositories/akopytov/sysbench/script.deb.sh | bash - &&\
apt-get install -y sysbench

RUN mkdir /test-volume
WORKDIR /workdir
COPY . .
RUN npm install

# Swap entrypoint with this while developing js/index.js, docker run -it into the container,
#		and modify js code
# CMD ["bash"]

# Entrypoint allows cli vars to pass to index.js
ENTRYPOINT ["node", "index.js"]
