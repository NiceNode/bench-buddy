/**
		MIN_AVAILABLE_DISK_SPACE_GB = {
				NETWORK_MAINNET: 1700.0,
				NETWORK_GOERLI: 300.0
		}

		MIN_SUSTAINED_K_READ_IOPS = 3.0
		MIN_SUSTAINED_K_WRITE_IOPS = 1.0

		MIN_DOWN_MBS = 4.5
		MIN_UP_MBS = 4.5
		https://en.wikipedia.org/wiki/Data_cap

		MIN_AVAILABLE_RAM_GB = 12.0

		if test, only run required (ex. if(test.cpu.cores))
 */

export default {
	cpu: {
		cores: {
			minimum: 2,
			recommended: 4
		}
	},
	memory: {
		total: {
			unit: 'GB',
			minimum: 8,
			recommended: 16
		},
		available: {
			unit: 'GB',
			minimum: 12,
			recommended: 18
		},
	},
	storage: {
		size: {
			unit: 'GB',
			minimum: 1000,
			recommended: 2000
		},
		iops: {
			read : {
				unit: 'iops',
				minimum: 3000,
				recommended: 10000
			},
			write : {
				unit: 'iops',
				minimum: 1000,
				recommended: 6000
			}
		},
	},
	internet: {
		speed: {
			download : {
				unit: 'Mbps',
				minimum: 10,
				recommended: 25
			},
			upload : {
				unit: 'Mbps',
				minimum: 10,
				recommended: 25
			}
		},
		dataCap: {
			unit: 'TB',
			minimum: 2,
			recommended: 6
		}
	},
	time: {
		accuracy : {
			unit: 'seconds',
			maximum: 0,
			recommended: 0
		}
	}
};