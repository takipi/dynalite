'use strict';
var sql = require('./sql-flavour');

function encode(value, isValue) {
  if (isValue && !value) {
    value = new Buffer('');
  }
  if (!Buffer.isBuffer(value) && typeof value !== 'string') {
    value = String(value);
  }
  if (!Buffer.isBuffer(value)) {
    value = new Buffer(value);
  }
  return value;
}

function decode(value, asBuffer) {
  if (asBuffer) {
    return value;
  } else {
    return value.toString();
  }
}

exports.encode = encode;
exports.decode = decode;