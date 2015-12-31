var once = require('once'),
    db = require('../db'),
    logger = require('../logger')

module.exports = function listTables(store, data, cb) {
  if (logger.getInstance())
    logger.getInstance().trace({exData: data}, "Listing Tables")
  
  cb = once(cb)
  var opts, keys

  if (data.ExclusiveStartTableName)
    opts = {start: data.ExclusiveStartTableName + '\x00'}

  keys = db.lazy(store.tableDb.createKeyStream(opts), cb)

  if (data.Limit) keys = keys.take(data.Limit + 1)

  keys.join(function(names) {
    var result = {}
    if (data.Limit && names.length > data.Limit) {
      names.splice(data.Limit)
      result.LastEvaluatedTableName = names[names.length - 1]
    }
    result.TableNames = names
    cb(null, result)
  })
}
