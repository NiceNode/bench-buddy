# speedometer
Runtime environment performance testing for containers - outputs cpu, memory, disk (ssd) read and write speeds, internet speeds, and more. This is valuable to test a container environment's resources and setup.
## Getting started
### Pre-requisite
Install a container runtime like [Podman](https://podman.io/) or [Docker](https://www.docker.com/)
### Run
```
podman run ghcr.io/nicenode/speedometer
docker run ghcr.io/nicenode/speedometer

(sample output...)
Starting performance tests and other testing...

Number of cpu cores: 8 cores
Total memory: 12 GB

running a ~10 second file input and output speed test ...
(mount a volume to directory /test-volume to test the mount speed.)
Read: 3429 IOPS, 2972 min IOPS
Write: 1142 IOPS, 998 min IOPS

running a 10-30 second www.speedtest.net internet speed test ...
Ping: average 6.073ms, max 8.073ms
Download: average 294Mbps, latency: iqm 9.174ms and max 123.8ms
Upload: average 175Mbps, latency: iqm 85.826ms and max 268.886ms
Speedtest link: https://www.speedtest.net/result/c/3e219403-e33c-426b-9c2a-1983126a6e4e
```
To test a mounted disk speed, mount it to /test-volume like so
```
docker run -v /path/to/host/disk:/test-volume ghcr.io/nicenode/speedometer
```
Output JSON
```
docker run ghcr.io/nicenode/speedometer -f json
{
  "cpu":{
    "cores":8,
    "maxThreads":94296,
    "sysbenchTest":{
      "1":10738,
      "4":42018,
      "8":75840,
      "32":75818
    }
  },
  "memory":{
    "total":11928,
    "sysbenchTest":{
      "read":{
        "32MB":40749,
        "1G":40819
      },
      "write":{
        "32MB":32409,
        "1G":32186
      }
    }
  },
  "disk":{
    "readIOPS":30068,
    "writeIOPS":10049,
    "readMinIOPS":25966,
    "writeMinIOPS":8638
  },
  "internet":{
    "download":365,
    "upload":175,
    "latency":6.194,
    "resultsUrl":"https://www.speedtest.net/result/c/a433dc9e-cb55-443b-8253-37a83a5cf591"
  }
}
```
This project is in early stages, so expect the output format to change.
Run a limited set of tests
Example only run cpu and memory tests
```
docker run ghcr.io/nicenode/speedometer -t cpu memory
```
CLI documentation
```
docker run ghcr.io/nicenode/speedometer --help
```
### Develop
Local environment setup: 
1. In the Containerfile, swap commenting out the `entrypoint` with `cmd bash`
2. Build a local container `podman build -t speedometer-local .`
3. Run the container interactively with a volume mount from this repo to `/workdir` in the container `podman run -it -v $(pwd):/workdir speedometer-local` so that changes to code on your host machine will reflect inside the container.
4. Modify index.js code
5. Run `node /workdir/index.js` inside the container

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
