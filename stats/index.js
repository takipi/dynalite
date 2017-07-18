var logger = require('../logger')

exports.createStats = createStats

function createStats (statsdIp)
{
  var counters = {}
  var lastData = null
  var statsdIp = options.statsdIp;
  var statsdPrefix = options.statsdPrefix;
  var counterPrefix = options.nodeName ? options.nodeName + "." : "";

  if (statsdIp) {
     var SDC = require('statsd-client');
     sdc = new SDC({host: statsdIp});
     console.log('Initilize statsd client with the dest ip of %s', statsdIp)
  }

  function incCounter (counterName) {
    try {
      if (counters.hasOwnProperty(counterName))
        counters[counterName]++
	if (sdc) {
	    sdc.increment(counterPrefix + "." + counterName);
	} 
      else
        counters[counterName] = 1
        if (sdc) {
	   sdc.counter(counterPrefix + "." + counterName, 1);
	} 
    }
    catch (err) {
      if (logger.getInstance())
        logger.getInstance().error("Failed to increment counter: " + counterName)
    }
  }

  function getCounters () {
    var timestamp = new Date()
    var result = parseCountersToString(counters, timestamp)

    if (lastData)
      result += parseCountersToString(lastData.value, lastData.key)

    lastData = {key: new Date(), value: cloneCounters(counters)}
    counters = {}

    return result
  }

  return {
    incCounter: incCounter,
    getCounters: getCounters,
  }
}

function cloneCounters(counters) {
  var result = {}

  if ((counters) &&
      (Object.keys(counters).length > 0)) {

    for (var key in counters)
    {
      if (counters.hasOwnProperty(key))
        result[key] = counters[key]
    }
  }

  return result;
}

function parseCountersToString(counters, timestamp) {
  var result = ""

  if (counters) {

    var result = "\n- STATS (" + timestamp + ") -\n"

    if (Object.keys(counters).length > 0) {

      for (var key in counters)
      {
        if (counters.hasOwnProperty(key))
          result += "Action-Table: " + key + " was called: " + counters[key] + " times\n"
      }
    }
    else
      result += "No stats recorded\n"
  }

  return result;
}
