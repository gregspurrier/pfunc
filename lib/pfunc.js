// Return a new PFunc promise.
function create() {
  var state = 'pending';
  var values;
  var cascades = [];
  
  function isPromise(p) {
    return p && p.then instanceof Function;
  }

  // Invoke a resolution callback and cascade the result to the
  // downstream promise.
  function invokeCascadeCallback(cb, promise, args) {
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
  
  // Return a function that will cascade a resolution value to the
  // downstream promise, routing it through the callback registered
  // with .then(), if present.
  function cascader(cb, passThrough, promise) {
    if (cb instanceof Function) {
      return invokeCascadeCallback.bind(null, cb, promise);
    } else {
      return function(args) { passThrough.apply(null, args); };
    }
  }
  
  // Resolve a pending promise to either 'fulfilled' or 'rejected' and
  // cascade the result to any downstream promises previously created
  // via .then().
  function resolve(newState /*, values* */) {
    if (state === 'pending') {
      state = newState;
      values = Array.prototype.slice.call(arguments, 1);
      cascades.forEach(function(cascade) {
        cascade[newState](values);
      });
    }
  }

  // The actual promise
  var promise = function(err /*, values* */) {
    if (err) {
      promise.reject(err);
    } else {
      var args = Array.prototype.slice.call(arguments, 1);
      promise.fulfill.apply(promise, args);
    }
  }
  promise.then = function(onFulfilled, onRejected) {
    var nextPromise = create();
    var cascade = {
      fulfilled: cascader(onFulfilled, nextPromise.fulfill, nextPromise),
      rejected: cascader(onRejected, nextPromise.reject, nextPromise)
    };

    if (state === 'pending') {
      cascades.push(cascade);
    } else {
      process.nextTick(cascade[state].bind(null, values));
    }
    return nextPromise;
  }
  promise.fulfill = resolve.bind(null, 'fulfilled');
  promise.reject = resolve.bind(null, 'rejected');

  return promise;
}

module.exports.create = create;
