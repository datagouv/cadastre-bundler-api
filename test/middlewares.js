const test = require('ava')
const express = require('express')
const request = require('supertest')
const {notImplemented, validFormat, validLayer} = require('../lib/middlewares')

test('notImplemented', async t => {
  const app = express()
  app.get('/', notImplemented)
  const res = await request(app).get('/')
  t.is(res.status, 501)
})

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

function makeAppWithLayer() {
  const app = express()
  app.param('layer', validLayer(['a', 'b']))
  app.get('/:layer', (req, res) => res.send({hello: 'coucou'}))
  return app
}

test('validLayer:valid', async t => {
  const res = await request(makeAppWithLayer()).get('/a')
  t.is(res.status, 200)
  t.is(res.body.hello, 'coucou')
})

test('validLayer:not-valid', async t => {
  const res = await request(makeAppWithLayer()).get('/c')
  t.is(res.status, 400)
})

