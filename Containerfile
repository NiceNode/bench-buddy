FROM ubuntu:latest

RUN apt-get -y update
RUN apt-get -y install git curl fio
RUN curl -fsSL https://deb.nodesource.com/setup_19.x | bash - &&\
apt-get install -y nodejs
RUN curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash - &&\
apt-get install speedtest

RUN mkdir /perf-volume
RUN mkdir /workdir
COPY index.js /workdir/index.js

# Swap entrypoint with this while developing js/index.js, docker run -it into the container,
#		and modify js code
# CMD ["bash"]

# Entrypoint allows cli vars to pass to index.js
ENTRYPOINT ["node", "/workdir/index.js"]
