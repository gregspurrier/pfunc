var pfunc = require('../lib/pfunc');

// By testing the callback-style interface we also exercise the underlying
// fulfill/reject-style interface.
module.exports.pending = function() {
  var promise = pfunc.create();
  return {
    promise: promise,
    fulfill: function(val) { promise(null, val); },
    reject:  function(val) { promise(val); }
  };
};
