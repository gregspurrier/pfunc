function create() {
  var state = 'pending';
  var values;
  var downstreamPromises = [];
  
  function isPromise(p) {
    return p && p.then instanceof Function;
  }

  function invoke(cb, args, promise) {
    try {
      var result = cb.apply(null, args);
      if (isPromise(result)) {
        result.then(promise.fulfill, promise.reject);
      } else {
        promise.fulfill(result);
      }
    } catch(e) {
      promise.reject(e);
    }
  }
  
  function fulfillDownstream(ds, args) {
    if(ds.onFulfilled) {
      invoke(ds.onFulfilled, args, ds.promise);
    } else {
      // Cascade to the next promise
      ds.promise.fulfill.apply(null, args);
    }
  }
  
  function fulfill(val) {
    if (state === 'pending') {
      state = 'fulfilled';
      values = arguments;
      downstreamPromises.forEach(function(ds) {
        fulfillDownstream(ds, values);
      });
    }
  }
  
  function rejectDownstream(ds, args) {
    if(ds.onRejected) {
      invoke(ds.onRejected, args, ds.promise);
    } else {
      // Cascade to the next promise
      ds.promise.reject.apply(null, args);
    }
  }
  
  function reject() {
    if (state === 'pending') {
      state = 'rejected';
      values = arguments;
      downstreamPromises.forEach(function(ds) {
        rejectDownstream(ds, values);
      });
    }
  }
  
  var cbPromise = function(err) {
    if (err) {
      reject(err);
    } else {
      fulfill.apply(null, Array.prototype.slice.call(arguments, 1));
    }
  }
  cbPromise.then = function(onFulfilled, onRejected) {
    onFulfilled = onFulfilled instanceof Function && onFulfilled;
    onRejected = onRejected instanceof Function && onRejected;
    var nextPromise = create();
    var ds = {onFulfilled: onFulfilled,
              onRejected: onRejected,
              promise: nextPromise}
    if (state === 'pending') {
      downstreamPromises.push(ds);
    } else if (state === 'fulfilled') {
      process.nextTick(fulfillDownstream.bind(null, ds, values));
    } else {
      process.nextTick(rejectDownstream.bind(null, ds, values));
    }
    return nextPromise;
  }
  cbPromise.fulfill = fulfill;
  cbPromise.reject = reject;
  return cbPromise;
}

module.exports.create = create;
