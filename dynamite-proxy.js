#!/usr/bin/env node

const TABLE_NAME_HEADER = "x-table-name";
const fs = require("fs");
const http = require('http');
const httpProxy = require('http-proxy');
const argv = require('minimist')(process.argv.slice(2));

if (argv.help) {
	return console.log([
		'',
		'Usage: node dynamite-proxy.js [options]',
		'',
		'A proxy http server for the real dynalite instance',
		'',
		'Options:',
		'--help                      Display this help message and exit',
		'--port <port>               The port for the proxy to listen on',
		'--dynamite <number>         The number of dynamo db instances behind this proxy',
		'--tablesMappingPath <path>  A json table mapping file',
		''
	].join('\n'))
}

var port = argv.port;
var dynamiteCount = argv.dynamite;
var tablesMappingPath = argv.tablesMappingPath;

if (!port) {
	return console.log("--port is missing");
}

if (!dynamiteCount) {
	return console.log("--dynamite is missing");
}

if (!tablesMappingPath || !fs.existsSync(tablesMappingPath)) {
	return console.log("--tablesMappingPath is missing (or the file is not exists)");
}

var tableNamesMapping;

try {
	var content = fs.readFileSync(tablesMappingPath);
	tableNamesMapping = JSON.parse(content);
} catch (e) {
	console.log("Error reading " + tablesMappingPath);
	return console.log(e);
}

var agent = new http.Agent({ keepAlive: true });
var proxy = httpProxy.createProxyServer({agent: agent});

// We use redirect instead of proxy in order to avoid the amount of connections
//	between the proxy and dynalite.
//
var useRedirect = true;

const requestHandler = (request, response) => {
	var tableName = request.headers[TABLE_NAME_HEADER];
	var targetInstancePort = calcPortByTableName(port + 1, tableName, dynamiteCount);
	var targetUrl = 'http://127.0.0.1:' + targetInstancePort;

	if (useRedirect) {
		response.writeHead(307, {
			'Location': targetUrl
		});
		response.end();
	} else {
		proxy.web(request, response, { target: targetUrl }, function(error) {
			res.statusCode = 500;
			res.write(error.toString());
			res.end();
		});
	}
}

const server = http.createServer(requestHandler)

server.listen(argv.port);

console.log("Dynamite count: " + dynamiteCount);
console.log("Tables mapping file: " + tablesMappingPath);
console.log("Proxy listening on port " + argv.port);

calcPortByTableName = function(basePort, tableName, dynamiteCount) {
	let mapping;

	if (tableName) {
		mapping = tableNamesMapping[tableName.toLowerCase()];
	}

	if (!mapping) {
		mapping = tableNamesMapping["default"];
	}
	
	let offset = (mapping % dynamiteCount);

	return basePort + offset;
}
