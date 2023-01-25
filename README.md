# container-performance
Container performance testing - outputs cpu, memory, disk (ssd) read and write speeds, internet speeds, and more. This is valuable to test a container environment's resources and setup.

## Roadmap
1. Test the ability to send udp messages over a port to an external client (ie. webserver)
2. Allow the user to change test settings and disable certain tests
3. Add memory and cpu speed tests
4. CI/CD to auto publish container builds to docker hub or another container repository

## Getting started
### Run
```
docker run johnsgresham/container-performance
podman run docker://johnsgresham/container-performance

(sample output...)
Starting performance tests and other testing...

Number of cpu cores: 8 cores
Total memory: 12 GB

running a 10 second file input and output speed test in directory /workdir ...
(mount a volume to directory /workdir to test the mount speed.)
Read: 3429 IOPS, 2972 min IOPS
Write: 1142 IOPS, 998 min IOPS

running a 10-30 second www.speedtest.net internet speed test ...
Ping: average 6.073ms, max 8.073ms
Download: average 294Mbps, latency: iqm 9.174ms and max 123.8ms
Upload: average 175Mbps, latency: iqm 85.826ms and max 268.886ms
Speedtest link: https://www.speedtest.net/result/c/3e219403-e33c-426b-9c2a-1983126a6e4e
```
To test a mounted disk speed, mount it to /workdir like so
```
docker run -v /path/to/host/disk:/workdir johnsgresham/container-performance
```
### Develop
Local environment setup: 
1. In the Containerfile, swap commenting out the `entrypoint` with `cmd bash`
2. Build a local container `podman build -t cont-perf-local .`
3. Run the container interactively with a volume mount from this repo to `/workdir` in the container `podman run -it -v $(pwd):/workdir cont-perf-local`
4. Modify index.js code
5. Run `node workdir/index.js` inside the container

## Why is my node not syncing?
The first goal of this project is to answer this question.

Secondly, this project can be used by developers and users who want to evaluate the performance and setup of their specific container environment. Example, a person who is a solo-home-ethereum-staker!

## Terms, agreements, privacy, etc
By using or running this code or container, you agree to the following agreements set by a third-party tool used inside this software:

==============================================================================

You may only use this Speedtest software and information generated
from it for personal, non-commercial use, through a command line
interface on a personal computer. Your use of this software is subject
to the End User License Agreement, Terms of Use and Privacy Policy at
these URLs:

	https://www.speedtest.net/about/eula
	https://www.speedtest.net/about/terms
	https://www.speedtest.net/about/privacy

==============================================================================
