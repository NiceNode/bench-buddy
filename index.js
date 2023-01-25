const path = require('node:path');
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const fs = require('fs').promises;

console.log("Starting performance tests and other testing...")
console.log("argv: ", process.argv)

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
	try {
		const { stdout, stderr } = await exec("lscpu |  grep CPU\\(s\\):");
			const output = stdout.split("\n")[0]; // get the first line of output
			const cores = output.split(/\s+/)[1]; // get the second column (cpu cores)
			console.log(`Number of cpu cores: ${cores} cores`);
	} catch(error) {
		if (error) {
			console.error(`exec error in cpuCores: ${error}`);
			return;
		}
	}
}

const totalMemory = async () => {
	try {
		const { stdout, stderr } = await exec("free -m");
			const output = stdout.split("\n")[1]; // get the second line of output
			const memory = output.split(/\s+/)[1]; // get the second column (total memory)
			console.log(`Total memory: ${rnd(memory/1000)} GB`);
	} catch(error) {
		if (error) {
			console.error(`exec error in totalMemory: ${error}`);
			return;
		}
	}
}

// fio man pages https://manpages.ubuntu.com/manpages/xenial/man1/fio.1.html
const fioSpeed = async () => {
	try {
		const fio_target_filename = path.join('workdir', "random_read_write.fio");
		const fio_output_filename = path.join('workdir', "fio.out");

		// limits runtime to 30 seconds
		let fioArgs = [
			'fio', '--randrepeat=1', '--ioengine=libaio', '--direct=1', '--gtod_reduce=1',
			'--name=test', '--filename=' + fio_target_filename, '--bs=4k', '--iodepth=64',
			'--size=4G', '--readwrite=randrw', '--rwmixread=75', '--output=' + fio_output_filename,
			'--output-format=json', '--runtime=30'
			];
		
		let fioCommand = fioArgs.join(" ");
		console.log(fioCommand)
		console.log("running a 10 second file input and output speed test in directory /workdir ...")
		console.log("(mount a volume to directory /workdir to test the mount speed.)")

		const { stdout, stderr } = await exec(fioCommand);
		const outputJSON = await parseJSON(fio_output_filename);
		const fioJob = outputJSON.jobs[0];
		console.log(`Read: ${rnd(fioJob.read.iops)} IOPS, ${rnd(fioJob.read.iops_min)} min IOPS`);
		console.log(`Write: ${rnd(fioJob.write.iops)} IOPS, ${rnd(fioJob.write.iops_min)} min IOPS`);
		
		// delete the test input and output files
		await fs.unlink(fio_target_filename)
		await fs.unlink(fio_output_filename)

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
		console.log("running a 10-30 second www.speedtest.net internet speed test ...")

		const { stdout, stderr } = await exec(command);
		const outputJSON = await JSON.parse(stdout);

		console.log(`Ping: average ${outputJSON.ping.latency}ms, max ${outputJSON.ping.high}ms`);
		console.log(`Download: average ${rnd((outputJSON.download.bandwidth*8)/1e6)}Mbps, latency: iqm ${outputJSON.download.latency.iqm}ms and max ${outputJSON.download.latency.high}ms`);
		console.log(`Upload: average ${rnd((outputJSON.upload.bandwidth * 8)/1e6)}Mbps, latency: iqm ${outputJSON.upload.latency.iqm}ms and max ${outputJSON.upload.latency.high}ms`);
		console.log(`Speedtest link: ${outputJSON.result.url}`);
	} catch(error) {
		if (error) {
			console.error(`internetSpeed error: ${error}`);
			return;
		}
	}
}




const main = async () => {
	await cpuCores();
	await totalMemory();
	await fioSpeed();
	await internetSpeed();
}

main()
