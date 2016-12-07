var winston = require('winston'),
	fs = require('fs'),
	dateFormat = require('dateformat'),
	util = require('util'),
	path = require('path'),
	pad = require('pad');
	
exports.createLogger = createLogger
exports.getInstance = getInstance

var instance;

// Public
function createLogger (defaultPath, opts) {
	if (!opts.verbose) {
		instance = {
			info:function() {},
			debug:function() {},
			error:function() {},
			warn:function() {},
		}
		
		return instance;
	}
	
	var dataDirectory = opts.path ? opts.path : defaultPath // If we're not in-memory use the same directory for logs.
	var logsDirectory = getValidLogDirectory(dataDirectory);
	var fullPath = path.join(logsDirectory, getLogFileName(opts.logFileName || "dynalite_log"));

	instance = new (winston.Logger)({
		transports: [
			new (winston.transports.File)({
				timestamp: function() {
					return Date.now();
				},
				formatter: function(options) {
					var formattedTime = dateFormat(options.timestamp(), "yyyy-mm-dd h:MM:ss");
					
					var msg = util.format("%s %s %s", 
						pad(formattedTime, 20),
						pad(options.level.toUpperCase(), 6),
						options.message);
					
					return msg
				},
				filename: fullPath,
				json: false,
				level: "debug"
			})
		]
	});
	
	console.log("Writing logs to - " + fullPath)
	
	return instance
}

function getInstance() {
	return instance
}

function getLogFileName(logName) {
	var date = new Date()
	var dateString =  (date.getMonth() + 1) + "." + date.getDate() + "." + date.getFullYear()
	
	return logName + "-" + dateString + '.log'
}

function getValidLogDirectory(dataDirectory) {
	var logsDir = path.join(dataDirectory, "dynaLog");
	
	if (!fs.existsSync(logsDir)) {
		fs.mkdirSync(logsDir)
	}
	
	return logsDir;
}
