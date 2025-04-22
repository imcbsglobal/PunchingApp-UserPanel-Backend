//middleware/asyncHandler.js
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
// This code exports a function that takes another function (fn) as an argument and returns a new function that handles asynchronous errors using Promises. If an error occurs, it calls the next middleware with the error.
