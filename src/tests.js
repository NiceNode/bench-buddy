/**
 * The first version of speedometer was based off of 
 * stakehouse's eth-wizard tests. 
 * (https://github.com/stake-house/eth-wizard/blob/main/ethwizard/platforms/ubuntu/install.py#L51) 
 */

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk';

import path from 'node:path'
import fs from 'node:fs/promises'
import util from 'node:util'
import { exec as execCallback } from 'node:child_process'
import fetch from 'node-fetch';

import ethNode from './node-requirements/eth-node.js';

// console.log(ethNode)

const exec = util.promisify(execCallback);
const error = chalk.bold.red;
const warning = chalk.hex('#FFA500'); // Orange color
const success = chalk.green;

// console.log("argv: ", process.argv)
let ogConsoleLog = console.log;

const rnd = Math.round;

let inputArgs;
let inputReq;

const parseJSON = async (filepath) => {
  try {
    const data = await fs.readFile(filepath, 'utf8');
    const json = JSON.parse(data);
    return json;
  } catch (err) {
    console.error(`Error reading or parsing JSON file: ${err}`);
  }
}

const cpu = async (req) => {
	const results = {};
	try {
			if(!req || req?.cores) {
				let { stdout, stderr } = await exec("lscpu |  grep CPU\\(s\\):");
				const output = stdout.split("\n")[0]; // get the first line of output
				const cores = parseInt(output.split(/\s+/)[1]); // get the second column (cpu cores)
				console.log(`Number of cpu cores: ${cores} cores`);
				results.cores = cores
				if(req?.cores) {
					const reqCores = req?.cores
					if(reqCores.minimum && cores < reqCores.minimum) {
						console.log(error(`***Requires a minimum of ${reqCores.minimum} cores`))
					} else if(reqCores.recommended && cores < reqCores.recommended) {
						console.log(warning(`Recommendeds more than ${reqCores.recommended} cores`))
					} else {
						console.log(success(`Satisfies recommended ${reqCores.recommended} cores`))
					}
				}
			}


			if(!req || req?.threads) {
				const maxThreadsCmd = "cat /proc/sys/kernel/threads-max";
				let { stdout: stdout2, stderr: stderr2 } = await exec(maxThreadsCmd);
				const maxThreads = parseInt(stdout2)
				console.log(`Maximum number of cpu threads: ${maxThreads} threads`);
				results.maxThreads = maxThreads
			}
			if(!req || req?.sysbench) {
				let threadsAssay = [1, 4, 8, 32]
				const sysbenchResults = {}
				for(let i=0; i<threadsAssay.length; i++) {
					const numOfThreads = threadsAssay[i];
					const sysbenchCmd = `sysbench cpu --threads=${numOfThreads} --cpu-max-prime=50000 run`
					const label = 'total number of events:'
					let { stdout, stderr }  = await exec(`${sysbenchCmd} |  grep '${label}'`);
					const events = parseInt(stdout.split(/\s+/)[5]);
					console.log(`Test using threads: ${numOfThreads} threads, created cpu events: ${events} events`);
					sysbenchResults[numOfThreads] = events;
				}
				results.sysbenchTest = sysbenchResults;
			}

	} catch(error) {
		if (error) {
			console.error(`exec error in cpu: ${error}`);
			return;
		}
	}
	return results;
}

const memory = async (req) => {
	const results = {};
	try {
		if(!req || (req?.total || req?.available)) {

			const { stdout, stderr } = await exec("free -m");
			const output = stdout.split("\n")[1]; // get the second line of output
			const totalMemory = output.split(/\s+/)[1]; // get the second column (total memory)
			const availableMemory = output.split(/\s+/)[6]; // get the seventh column (avail. memory)
			const totalMemoryNumMB = parseInt(totalMemory)
			const availableMemoryNumMB = parseInt(availableMemory)
			const totalMemoryNumGB = rnd(totalMemoryNumMB/1000)
			const availableMemoryNumGB = rnd(availableMemoryNumMB/1000)
			if(!req || req?.total) {
				results.total = totalMemoryNumGB
				console.log(`Total memory: ${totalMemoryNumGB}GB`);
				if(req?.total) {
					const reqTotal = req.total
					if(reqTotal.minimum && totalMemoryNumGB < reqTotal.minimum) {
						console.log(error(`***Requires a minimum of ${reqTotal.minimum}GB total memory`))
					} else if(reqTotal.recommended && totalMemoryNumGB < reqTotal.recommended) {
						console.log(warning(`Recommendeds more than ${reqTotal.recommended}GB total memory`))
					} else {
						console.log(success(`Satisfies recommended ${reqTotal.recommended}GB total memory`))
					}
				}
			}
			
			if(!req || req?.available) {
				results.available = availableMemoryNumGB
				console.log(`Available memory: ${availableMemoryNumGB} GB`);
				if(req?.available) {
					const reqAvailable = req.available
					if(reqAvailable.minimum && availableMemoryNumGB < reqAvailable.minimum) {
						console.log(error(`***Requires a minimum of ${reqAvailable.minimum}GB available memory`))
					} else if(reqAvailable.recommended && availableMemoryNumGB < reqAvailable.recommended) {
						console.log(warning(`Recommendeds more than ${reqAvailable.recommended}GB available memory`))
					} else {
						console.log(success(`Satisfies recommended ${reqAvailable.recommended}GB available memory`))
					}
				}
			}
		}
		/**
			--memory-block-size=SIZE    size of memory block for test [1K]
			--memory-total-size=SIZE    total size of data to transfer [100G]
			--memory-scope=STRING       memory access scope {global,local} [global]
			--memory-hugetlb[=on|off]   allocate memory from HugeTLB pool [off]
			--memory-oper=STRING        type of memory operations {read, write, none} [write]
			--memory-access-mode=STRING memory access mode {seq,rnd} [seq]
			*/
		// 2020 AMD Ryzen 5800X CPU has 32MB L3 cache - test a block size greater
		if(!req || req?.sysbench) {
			let blockSizeAssay = ['32MB', '1G']
			const sysbenchResults = {}
			for(let i=0; i<2; i++) {
				let operation = i === 0 ? 'read'  : 'write';
				sysbenchResults[operation] = {};
				for(let i=0; i<blockSizeAssay.length; i++) {
					const blockSize = blockSizeAssay[i];
					const sysbenchCmdArgs = ['sysbench memory', 
						`--memory-block-size=${blockSize}`, '--memory-total-size=100000G', 
						'--memory-access-mode=seq', `--memory-oper=${operation}`,
						'run']
					const sysbenchCmd = sysbenchCmdArgs.join(' ');
					const label = 'transferred'
					let { stdout, stderr }  = await exec(`${sysbenchCmd} |  grep '${label}'`);
					// thanks chatGPT for this regex
					let match = stdout.match(/(\d+(?:\.\d+)?)\sMiB\/sec/);
					let speed = match ? parseInt(match[1]) : null;
					console.log(`Memory ${operation} test using blockSize: ${blockSize}, result speed: ${speed} MiB/sec`);
					sysbenchResults[operation][blockSize] = speed;
				}
			}
			results.sysbenchTest = sysbenchResults;
		}
		
	} catch(error) {
		if (error) {
			console.error(`exec error in memory: ${error}`);
			return;
		}
	}
	return results;
}

const storage = async (req) => {
	const VOLUME_MOUNT_PATH = "/test-volume"

	const results = {};
	try {
		if(!req || req?.iops) {
			results.iops = {};

			const fio_target_filename = path.join(VOLUME_MOUNT_PATH, "random_read_write.fio");
			const fio_output_filename = path.join(VOLUME_MOUNT_PATH, "fio.out");

			const RUN_TIME = 30;
			// limits runtime to 30 seconds
			// docs: https://fio.readthedocs.io/en/latest/fio_doc.html#command-line-options
			/**
			 * 	libaio
			 * 		Linux native asynchronous I/O.
			 *	randrw
			*		Random mixed reads and writes.
			*/
			let fioArgs = [
				'fio', '--randrepeat=1', 
				'--ioengine=libaio', 
				'--direct=1', '--gtod_reduce=1',
				'--name=test', '--filename=' + fio_target_filename, '--bs=4k', '--iodepth=64',
				'--size=4G', '--readwrite=randrw', '--rwmixread=75', '--output=' + fio_output_filename,
				'--output-format=json', '--runtime=' + RUN_TIME
				];
			
			let fioCommand = fioArgs.join(" ");
			console.log(`running about ~${RUN_TIME} second file input and output speed test...`)
			console.log(`(mount a volume to directory ${VOLUME_MOUNT_PATH} to test the mount speed.)`)

			const { stdout, stderr } = await exec(fioCommand);
			const outputJSON = await parseJSON(fio_output_filename);
			const fioJob = outputJSON.jobs[0];
				
			const readAvgIops = rnd(fioJob.read.iops)
			const writeAvgIops = rnd(fioJob.write.iops)
			const readMinIOPS = rnd(fioJob.read.iops_min)
			const writeMinIOPS = rnd(fioJob.write.iops_min)

			if(!req || req?.iops?.read) {
				results.iops.read = {
					average: readAvgIops
				}
				console.log(`Read: ${readAvgIops} IOPS, ${readMinIOPS} min IOPS`);
				if(req?.iops?.read) {
					const reqTotal = req.iops.read
					if(reqTotal.minimum && readAvgIops < reqTotal.minimum) {
						console.log(error(`***Requires a minimum of ${reqTotal.minimum}IOPS read`))
					} else if(reqTotal.recommended && readAvgIops < reqTotal.recommended) {
						console.log(warning(`Recommendeds more than ${reqTotal.recommended}IOPS read`))
					} else {
						console.log(success(`Satisfies recommended ${reqTotal.recommended}IOPS read`))
					}
				}
				// results.readIOPS = readAvgIops
				// results.readMinIOPS = readMinIOPS
			}
			if(!req || req?.iops?.write) {
				results.iops.write = {
					average: writeAvgIops
				}
				console.log(`Write: ${writeAvgIops} IOPS, ${writeMinIOPS} min IOPS`);
				if(req?.iops?.write) {
					const reqTotal = req.iops.write
					if(reqTotal.minimum && writeAvgIops < reqTotal.minimum) {
						console.log(error(`***Requires a minimum of ${reqTotal.minimum}IOPS write`))
					} else if(reqTotal.recommended && writeAvgIops < reqTotal.recommended) {
						console.log(warning(`Recommendeds more than ${reqTotal.recommended}IOPS write`))
					} else {
						console.log(success(`Satisfies recommended ${reqTotal.recommended}IOPS write`))
					}
				}
				// results.writeIOPS = writeAvgIops
				// results.writeMinIOPS = writeMinIOPS
			}
			
			// delete the test input and output files
			await fs.unlink(fio_target_filename)
			await fs.unlink(fio_output_filename)
		}

		if(!req || req?.size) {
			results.size = {};
			// --block-size must follow -h
			const { stdout, stderr } = await exec(`df -h ${VOLUME_MOUNT_PATH} --block-size=GB`);
			const output = stdout.split("\n")[1]; // get the second line of output
			// get the 2nd and 4th column and remove trailing G
			const totalStorage = output.split(/\s+/)[1].slice(0, -1); 
			const availableStorage = output.split(/\s+/)[3].slice(0, -1);
			const totalStorageNumGB = parseInt(totalStorage)
			const availableStorageNumGB = parseInt(availableStorage)
			
			console.log(`Total storage: ${totalStorageNumGB}GB`);
			console.log(`Available storage: ${availableStorageNumGB}GB`);
			results.size.total = totalStorageNumGB
			results.size.available = availableStorageNumGB

			if(req?.size) {
				const reqTotal = req.size
				if(reqTotal.minimum && availableStorageNumGB < reqTotal.minimum) {
					console.log(error(`***Requires a minimum of ${reqTotal.minimum}GB available storage`))
					if(totalStorageNumGB > reqTotal.minimum) {
						console.log(`Total storage exceeds the minimum. Consider freeing up storage.`);
					}
				} else if(reqTotal.recommended && availableStorageNumGB < reqTotal.recommended) {
					console.log(warning(`Recommendeds more than ${reqTotal.recommended}GB available storage`))
					if(totalStorageNumGB > reqTotal.recommended) {
						console.log(`Total storage exceeds the recommended. Consider freeing up storage.`);
					}
				} else {
					console.log(success(`Satisfies recommended ${reqTotal.recommended}GB available storage`))
				}
			}

		}

		return results;
	} catch(error) {
		if (error) {
			console.error(`exec error: ${error}`);
			return;
		}
	}
}

const internetSpeed = async (req) => {
	const results = {};

	try {
		if(!req || req?.speed) {

			// speedtest.net docs: https://www.speedtest.net/apps/cli

			// In our README, it specifies that the speedtest license will be accepted
			// 	on behalf of the user.
			let args = [
				'speedtest', '--accept-license', '-f', 'json'];
			
			let command = args.join(" ");
			console.log("running a 30 second www.speedtest.net internet speed test ...")

			const { stdout, stderr } = await exec(command);
			const outputJSON = await JSON.parse(stdout);

			const downloadAvgMbps = rnd((outputJSON.download.bandwidth*8)/1e6);
			const uploadAvgMbps = rnd((outputJSON.upload.bandwidth * 8)/1e6);
			console.log(`Ping: average ${outputJSON.ping.latency}ms, max ${outputJSON.ping.high}ms`);
			results.download = downloadAvgMbps;
			results.upload = uploadAvgMbps;
			results.latency = outputJSON.ping.latency;
			results.resultsUrl = outputJSON.result.url;

			console.log(`Download: average ${downloadAvgMbps}Mbps, latency: iqm ${outputJSON.download.latency.iqm}ms and max ${outputJSON.download.latency.high}ms`);
			if(req?.speed?.download) {
				const reqTotal = req.speed.download
				if(reqTotal.minimum && downloadAvgMbps < reqTotal.minimum) {
					console.log(error(`***Requires a minimum of ${reqTotal.minimum}Mbps download`))
				} else if(reqTotal.recommended && downloadAvgMbps < reqTotal.recommended) {
					console.log(warning(`Recommendeds more than ${reqTotal.recommended}Mbps download`))
				} else {
					console.log(success(`Satisfies recommended ${reqTotal.recommended}Mbps download`))
				}
			}
			console.log(`Upload: average ${uploadAvgMbps}Mbps, latency: iqm ${outputJSON.upload.latency.iqm}ms and max ${outputJSON.upload.latency.high}ms`);
			if(req?.speed?.upload) {
				const reqTotal = req.speed.upload
				if(reqTotal.minimum && uploadAvgMbps < reqTotal.minimum) {
					console.log(error(`***Requires a minimum of ${reqTotal.minimum}Mbps upload`))
				} else if(reqTotal.recommended && uploadAvgMbps < reqTotal.recommended) {
					console.log(warning(`Recommendeds more than ${reqTotal.recommended}Mbps upload`))
				} else {
					console.log(success(`Satisfies recommended ${reqTotal.recommended}Mbps upload`))
				}
			}
			console.log(`Speedtest link: ${outputJSON.result.url}`);
		}

		if(req?.dataCap) {
			console.log(warning(`Speedometer cannot test your data cap.\nRequires a data cap minimum of ${req?.dataCap.minimum}TB, but recommended ${req?.dataCap.recommended}TB or more.`))
		}
		return results;
	} catch(error) {
		if (error) {
			console.error(`internetSpeed error: ${error}`);
			return;
		}
	}
}

const timeAccuracy = async (req) => {
	const results = {};
	try {
		if(!req || req?.accuracy) {
			// WorldTimeAPI docs: http://worldtimeapi.org/pages/privacypolicy

			// In our README, it specifies that the WorldTimeAPI license will be accepted
			// 	on behalf of the user.
			const timeUrl = "http://worldtimeapi.org/api/timezone/America/Los_Angeles"
			const localTimeBefore = Date.now();
			const response = await fetch(timeUrl);
			const localTimeAfter = Date.now();
			const localTimeAvgMs = (localTimeAfter + localTimeBefore) / 2;
			const serverData = await response.json();
			const serverTimeSec = serverData.unixtime;

			// use Math.floor because the server currently returns second accuracy
			//	so the server's time is effectively using floor too 
			const localTimeSeconds = Math.floor(localTimeAvgMs/1000);
			const diff = Math.abs(serverTimeSec - localTimeSeconds)
			// todo: sub second precision
			console.log(`Time accuracy: local time off by ${diff} seconds`)
			console.log(`Local time: ${new Date(localTimeAvgMs).toLocaleString()}, Server time ${new Date(serverTimeSec*1000).toLocaleString()}`);
			console.log(`Local time: ${localTimeSeconds} seconds UTC, Server time ${serverTimeSec} seconds UTC`);

			if(req?.accuracy) {
				const reqTotal = req.accuracy
				if(reqTotal.maximum !== undefined && diff > reqTotal.maximum) {
					console.log(error(`***Requires a maximum of ${reqTotal.maximum} seconds error`))
				} else if(reqTotal.recommended  !== undefined && diff > reqTotal.recommended) {
					console.log(warning(`Recommendeds less than ${reqTotal.recommended} seconds error`))
				} else {
					console.log(success(`Satisfies recommended ${reqTotal.recommended} seconds error`))
				}
			}

			results.localTime = localTimeSeconds;
			results.serverTime = serverTimeSec;
		}
		return results;
	} catch(error) {
		if (error) {
			console.error(`timeAccuracy error: ${error}`);
			return;
		}
	}
}

export const main = async () => {
	const results = {};
	inputReq = inputArgs.requirements === 'eth-node' ? ethNode : undefined;

	// logic to run a test
	// if not included in test, nope
	// if not req OR req included
	let runNextTest = inputReq === undefined || inputReq.cpu;
	if(inputArgs.tests.includes('cpu') && runNextTest) {
		console.log("\n------ CPU ------")
		results.cpu = await cpu(inputReq?.cpu);
	}
	runNextTest = inputReq === undefined || inputReq.memory;
	if(inputArgs.tests.includes('memory') && runNextTest) {
		console.log("\n------ Memory ------")
		results.memory = await memory(inputReq?.memory);
	}
	runNextTest = inputReq === undefined || inputReq.storage;
	if(inputArgs.tests.includes('storage') && runNextTest) {
		console.log("\n------ Storage ------")
		results.storage = await storage(inputReq?.storage);
	}
	runNextTest = inputReq === undefined || inputReq.internet;
	if(inputArgs.tests.includes('internet') && runNextTest) {
		console.log("\n------ Internet ------")
		results.internet = await internetSpeed(inputReq?.internet);
	}
	runNextTest = inputReq === undefined || inputReq.time;
	if(inputArgs.tests.includes('time') && runNextTest) {
		console.log("\n------ Time ------")
		results.time = await timeAccuracy(inputReq?.time);
	}
	if(inputArgs.format == 'json') {
		ogConsoleLog(JSON.stringify(results))
	}
}

// option docs https://github.com/yargs/yargs/blob/main/docs/api.md#optionskey-opt
inputArgs = yargs(hideBin(process.argv))
	.option('format', {
		alias: 'f',
		describe: 'change the output format (ex. json)',
		type: 'string',
		default: 'pretty',
		choices: ['json', 'pretty']
	})
	.option('tests', {
		alias: 't',
		describe: 'tests to run. space separated (ex. cpu internet)',
		type: 'array',
		default: ['memory', 'internet', 'cpu', 'storage', 'time'],
		defaultDescription: 'all',
		choices: ['memory', 'internet', 'cpu', 'storage', 'time']
	})
	.option('requirements', {
		alias: 'r',
		describe: 'test against specific requirements (ex. eth-node)',
		type: 'string',
		default: undefined,
		choices: ['eth-node']
	})
	.help()
	.epilogue('For more information, visit https://github.com/NiceNode/speedometer')
  .parse()

// console.log (inputArgs)

// temporary trick to mute console logs when outputting json
if(inputArgs.format !== 'pretty') {
	console.log = () => {}
}