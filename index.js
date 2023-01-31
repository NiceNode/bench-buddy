/**
 * The first version of speedometer was based off of 
 * stakehouse's eth-wizard tests. 
 * (https://github.com/stake-house/eth-wizard/blob/main/ethwizard/platforms/ubuntu/install.py#L51) 
 */

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import path from 'node:path'
import fs from 'node:fs/promises'
import util from 'node:util'
import { exec as execCallback } from 'node:child_process'

let inputArgs;

const exec = util.promisify(execCallback);

// console.log("argv: ", process.argv)
let ogConsoleLog = console.log;

const rnd = Math.round;

const parseJSON = async (filepath) => {
  try {
    const data = await fs.readFile(filepath, 'utf8');
    const json = JSON.parse(data);
    return json;
  } catch (err) {
    console.error(`Error reading or parsing JSON file: ${err}`);
  }
}

const cpuCores = async () => {
	const results = {};
	try {
		const { stdout, stderr } = await exec("lscpu |  grep CPU\\(s\\):");
			const output = stdout.split("\n")[0]; // get the first line of output
			const cores = parseInt(output.split(/\s+/)[1]); // get the second column (cpu cores)
			console.log(`Number of cpu cores: ${cores} cores`);
			results.cores = cores
	} catch(error) {
		if (error) {
			console.error(`exec error in cpuCores: ${error}`);
			return;
		}
	}
	return results;
}

const totalMemory = async () => {
	const results = {};
	try {
		const { stdout, stderr } = await exec("free -m");
			const output = stdout.split("\n")[1]; // get the second line of output
			const memory = output.split(/\s+/)[1]; // get the second column (total memory)
			const memoryNumMB = parseInt(memory)
			console.log(`Total memory: ${rnd(memory/1000)} GB`);
			results.total = memoryNumMB
	} catch(error) {
		if (error) {
			console.error(`exec error in totalMemory: ${error}`);
			return;
		}
	}
	return results;
}

// fio man pages https://manpages.ubuntu.com/manpages/xenial/man1/fio.1.html
const fioSpeed = async () => {
	try {
		const VOLUME_MOUNT_PATH = "perf-volume"

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
		console.log(`running about ${RUN_TIME} second file input and output speed test in directory /workdir ...`)
		console.log(`(mount a volume to directory /${VOLUME_MOUNT_PATH} to test the mount speed.)`)

		const { stdout, stderr } = await exec(fioCommand);
		const outputJSON = await parseJSON(fio_output_filename);
		const fioJob = outputJSON.jobs[0];
			
		const readAvgIops = rnd(fioJob.read.iops)
		const writeAvgIops = rnd(fioJob.write.iops)
		const readMinIOPS = rnd(fioJob.read.iops_min)
		const writeMinIOPS = rnd(fioJob.write.iops_min)
		console.log(`Read: ${readAvgIops} IOPS, ${readMinIOPS} min IOPS`);
		console.log(`Write: ${writeAvgIops} IOPS, ${writeMinIOPS} min IOPS`);
		
		// delete the test input and output files
		await fs.unlink(fio_target_filename)
		await fs.unlink(fio_output_filename)

		const results = { 
			readIOPS: readAvgIops,
			writeIOPS: writeAvgIops,
			readMinIOPS: readMinIOPS,
			writeMinIOPS: writeMinIOPS
		}
		return results;
	} catch(error) {
		if (error) {
			console.error(`exec error: ${error}`);
			return;
		}
	}
}

const internetSpeed = async () => {
	try {
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
		console.log(`Download: average ${downloadAvgMbps}Mbps, latency: iqm ${outputJSON.download.latency.iqm}ms and max ${outputJSON.download.latency.high}ms`);
		console.log(`Upload: average ${uploadAvgMbps}Mbps, latency: iqm ${outputJSON.upload.latency.iqm}ms and max ${outputJSON.upload.latency.high}ms`);
		console.log(`Speedtest link: ${outputJSON.result.url}`);

		const results = { 
			download: downloadAvgMbps,
			upload: uploadAvgMbps,
			latency: outputJSON.ping.latency,
			resultsUrl: outputJSON.result.url
		}
		return results;
	} catch(error) {
		if (error) {
			console.error(`internetSpeed error: ${error}`);
			return;
		}
	}
}

const main = async () => {
	// console.log("Starting performance tests and other testing...")
	const results = {};
	if(inputArgs.tests.includes('cpu')) {
		results.cpu = await cpuCores();
	}
	if(inputArgs.tests.includes('memory')) {
		results.memory = await totalMemory();
	}
	if(inputArgs.tests.includes('disk')) {
		results.disk = await fioSpeed();
	}
	if(inputArgs.tests.includes('internet')) {
		results.internet = await internetSpeed();
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
		default: ['memory', 'internet', 'cpu', 'disk'],
		defaultDescription: 'all',
		choices: ['memory', 'internet', 'cpu', 'disk']
	})
	.help()
	.epilogue('For more information, visit https://github.com/NiceNode/speedometer')
  .parse()

// console.log (inputArgs)

// temporary trick to mute console logs when outputting json
if(inputArgs.format !== 'pretty') {
	console.log = () => {}
}

main()