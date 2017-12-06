const test = require('ava')
const express = require('express')
const request = require('supertest')
const {validFormat} = require('../lib/middlewares')

function makeAppWithFormat() {
  const app = express()
  app.param('format', validFormat(['a', 'b']))
  app.get('/:format', (req, res) => res.send({hello: 'coucou'}))
  return app
}

test('validFormat:valid', async t => {
  const res = await request(makeAppWithFormat()).get('/a')
  t.is(res.status, 200)
  t.is(res.body.hello, 'coucou')
})

test('validFormat:not-valid', async t => {
  const res = await request(makeAppWithFormat()).get('/c')
  t.is(res.status, 400)
})
