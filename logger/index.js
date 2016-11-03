var winston = require('winston'),
	fs = require('fs'),
	dateFormat = require('dateformat'),
	util = require('util'),
	pad = require('pad');
	
exports.createLogger = createLogger
exports.getInstance = getInstance

var instance
// Rotate the file every day
var logType = 'rotating-file' 
var logPeriod = '1d'
// By default don't show extra logs, intensive and un-needed.
var isOnRoids = false

// Public
function createLogger (name, defaultPath, opts) {
	var level = opts.verbose ? opts.verbose : opts.sVerbose
	
	var preferedPath = opts.path ? opts.path : defaultPath // If we're not in-memory use the same directory for logs.
	
	var validatedLvl = validateLevel(level)
	if (!validatedLvl) {
		validatedLvl = "info"
	}
	
	createLogDirectoryIfNeeded(preferedPath)
	var fullPath = preferedPath + '/dynaLog/' + getLogFileName(name)
	isOnRoids = opts.sVerbose ? true : false // Do we want the serializers to show extra details?
	
	if (!instance)
	{
		var instance = new (winston.Logger)({
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
					level: level
				})
			]
		});
		
		// instance = bunyan.createLogger({
		// 		name: name,
		// 		serializers: SERIALIZERS,
		// 		streams: [{
		// 			type: logType,
		// 			level: validatedLvl,
		// 			path: fullPath,
		// 			period: logPeriod
		// 		}]
		// 	}
		// )
		
		console.log("Writing logs to - " + fullPath)
	}
	
	return instance
}

// Public
function getInstance () {
	return instance
}

function validateLevel(level) {
	if (!level)
		return undefined
	
	var lwrLvl = level.toLowerCase()
	
	switch(lwrLvl) {
		case "trace":
		case "debug":
		case "info":
		case "warn":
		case "error":
		case "fatal":
			return lwrLvl
		default:
			return undefined
	}
}

function getLogFileName(logName) {
	var date = new Date()
	var dateString =  (date.getMonth() + 1) + "." + date.getDate() + "." + date.getFullYear()
	
	return logName + "-" + dateString + '.log'
}

function createLogDirectoryIfNeeded(path) {
	if (!fs.existsSync(path + '/dynaLog'))
		fs.mkdirSync(path + '/dynaLog')
}

function extraDataSerializer(data) {
	if (isOnRoids)
		return JSON.stringify(data)
	else
		return ""
}

// Return the same object, used for when we want the data to
// be contained inside the log message under a certain field.
function identitySerializer(data) {
	if (isOnRoids)
		return data
	else
		return ""
}

var SERIALIZERS = {
	exData: extraDataSerializer,
	body: identitySerializer
}
