/* eslint promise/prefer-await-to-then: off */
const isStream = require('is-stream')

function wrap(handler) {
  return (req, res) => {
    handler(req, res)
      .then(result => {
        if (isStream(result)) {
          result.pipe(res)
        } else {
          res.send(result)
        }
      })
      .catch(err => {
        if (err.message === 'premature close') {
          return
        }
        if (err.badRequest) {
          return res.status(400).send({
            code: 400,
            message: err.message
          })
        }
        if (err.notFound) {
          return res.status(400).send({
            code: 404,
            message: err.message
          })
        }
        if (err.response) {
          return res.status(err.statusCode).send(err.response.body)
        }
        if (err.status && err.body) {
          return res.status(err.status).send(err.body)
        }
        res.status(500).send({
          code: 500,
          message: err.message
        })
      })
  }
}

module.exports = wrap
