exports.notImplemented = (req, res) => {
  res.sendStatus(501)
}

exports.validFormat = allowedFormats => (req, res, next) => {
  if (!allowedFormats.includes(req.params.format)) {
    return res.sendStatus(400)
  }
  next()
}
