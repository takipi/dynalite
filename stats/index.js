var logger = require('../logger')

exports.createStats = createStats

function createStats ()
{
  var counters = []
  var lastData

  function incCounter (counterName) {
    try {
      if (counters.hasOwnProperty(counterName))
        counters[counterName]++
      else
        counters[counterName] = 1
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
      result += parseCountersToString(lastData[0].value, lastData[0].key)

    lastData = []
    lastData.push({ key: new Date(),
                    value: cloneCounters(counters) })
    counters = []

    return result
  }

  return {
    incCounter: incCounter,
    getCounters: getCounters,
  }
}

function cloneCounters(counters) {
  var result = []

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
