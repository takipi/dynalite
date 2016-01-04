var logger = require('../logger')

module.exports = function describeTable(store, data, cb) {
  if (logger.getInstance())
    logger.getInstance().trace("Describing table - " + data.TableName)
  
  store.getTable(data.TableName, false, function(err, table) {
    if (err) return cb(err)

    cb(null, {Table: table})
  })
}
