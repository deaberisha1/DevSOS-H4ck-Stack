// Wraps an async Express handler/middleware so a rejected promise is passed
// to next(err) instead of becoming an unhandled rejection. Express 4 does
// not await handlers automatically.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
