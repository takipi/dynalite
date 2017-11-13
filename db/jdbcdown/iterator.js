'use strict';
var inherits = require('inherits');
var AbstractIterator = require('abstract-leveldown/abstract-iterator');
var util = require('./encoding');
var PassThrough = require('stream').PassThrough;

function goodOptions(opts, name) {
  if (!(name in opts)) {
    return;
  }
  var thing = opts[name];
  if (thing === null) {
    delete opts[name];
    return;
  }
  if (Buffer.isBuffer(thing) || typeof thing === 'string') {
    if (!thing.length) {
      delete opts[name];
      return;
    }

    opts[name] = util.encode(thing);
  }
}

function Iterator(db, options, cb) {
  AbstractIterator.call(this, db);
  options = options || {};
  this._order = !options.reverse;
  this._options = options;
  this.table = db.table;
  
  names.forEach(function (i) {
    goodOptions(options, i);
  });

  this._stream  = new PassThrough({
    objectMode: true
  })

  this._stream.once('end', function() {
    self._endEmitted = true
  })

  this._count = 0;
  var self = this;
  if ('limit' in options) {
    this._limit = options.limit;
  } else {
    this._limit = -1;
  }

  if ('keyAsBuffer' in options) {
    this._keyAsBuffer = options.keyAsBuffer;
  } else {
    this._keyAsBuffer = true;
  }
  if ('valueAsBuffer' in options) {
    this._valueAsBuffer = options.valueAsBuffer;
  } else {
    this._valueAsBuffer = true;
  }

  var statement = this.buildSQL();
  if (this._limit === 0) {
    this._next = function (cb) {
      process.nextTick(cb);
    };
    return;
  }

  var __stream = this._stream;

  // TODO: trireme-jdbc has executeStream, which doesn't seem to work.
  // best to use an actual stream, or add a limit to fetched rows
  db.pool.execute(statement.sql, statement.args,
    function(err, result, rows) {
      var ended =false;
      if ((!rows) || (rows.length == 0))
      {
        __stream.end();
      }
      else
      {
        rows.forEach(function(row) {
          __stream.write(row, function(){if (ended){__stream.end();}});
        });
      }
      ended = true;
    });
}

inherits(Iterator, AbstractIterator);
module.exports = Iterator;
var names = [
  'start',
  'end',
  'gt',
  'gte',
  'lt',
  'lte'
];

Iterator.prototype._next = function(callback) {
  var self = this
    , obj = this._stream.read()
    , onReadable = function() {
        self._stream.removeListener('end', onEnd)
        self._next(callback)
      }
    , onEnd = function() {
        self._stream.removeListener('readable', onReadable)
        callback()
      }
    , key
    , value

  if (this._endEmitted)
    callback()
  else if (obj === null) {
    this._stream.once('readable', onReadable)

    this._stream.once('end', onEnd)
  }
  else {
    key = obj.K
    if (!this._keyAsBuffer) key = key.toString()

    value = obj.V
    if (!this._valueAsBuffer) value = value.toString()

    callback(null, key, value)
  }
}

Iterator.prototype._end = function(callback) {
  this._stream.end()
  callback()
}

Iterator.prototype.buildSQL = function () {
  var self = this;
  var sql = "select K, V from " + this.table + " where ";
  var args = [];
  var statement = {sql: sql, args: args};

  if (this._order) {
    if ('start' in this._options) {
      if (this._options.exclusiveStart) {
        if ('start' in this._options) {
          this._options.gt = this._options.start;
        }
      } else {
        if ('start' in this._options) {
          this._options.gte = this._options.start;
        }
      }
    }
    if ('end' in this._options) {
      this._options.lte = this._options.end;
    }
  } else {
    if ('start' in this._options) {
      if (this._options.exclusiveStart) {
        if ('start' in this._options) {
          this._options.lt = this._options.start;
        }
      } else {
        if ('start' in this._options) {
          this._options.lte = this._options.start;
        }
      }
    }
    if ('end' in this._options) {
      this._options.gte = this._options.end;
    }
  }

  if ('lt' in this._options) {
    appendWhere(statement, 'K <', this._options.lt);
  }
  if ('lte' in this._options) {
   appendWhere(statement, 'K <=', this._options.lte);
  }
  if ('gt' in this._options) {
   appendWhere(statement, 'K >', this._options.gt);
  }
  if ('gte' in this._options) {
   appendWhere(statement, 'K >=', this._options.gte);
  }

  statement.sql += " 1=1 ";

  if (this._order) {
    appendOrderBy(statement, true);
  }
  else {
    appendOrderBy(statement, false);
  }

  if (this._limit > 0) {
    statement.sql = statement.sql + " limit ?";
     statement.args.push(this._limit);
  }

  return statement;
};

function appendWhere(statement, condition, appendee)
{
  statement.sql += (condition + " '" + util.decode(appendee) + "' AND ");
}

function appendOrderBy(statement, bool) {
  statement.sql += " order by K " + (bool? "ASC" : "DESC");
}

module.exports = Iterator;