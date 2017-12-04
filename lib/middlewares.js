exports.notImplemented = (req, res) => {
  res.sendStatus(501)
}

exports.validFormat = allowedFormats => (req, res, next, format) => {
  if (!allowedFormats.includes(format)) {
    return res.sendStatus(400)
  }
  next()
}

exports.validLayer = allowedLayers => (req, res, next, layers) => {
  layers.map(layer => {
    if (!allowedLayers.includes(layer)) {
      return res.sendStatus(400)
    }
  })
  next()
}
