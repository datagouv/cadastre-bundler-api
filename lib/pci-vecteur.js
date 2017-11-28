const {Router} = require('express')
const {notImplemented, validFormat} = require('./middlewares')

const app = new Router()

app.use(validFormat(['edigeo', 'edigeo-cc', 'dxf']))

app.get('/departements/:codeDepartement/:format', notImplemented)
app.get('/communes/:codeCommune/:format', notImplemented)
app.get('/feuilles/:codeFeuille/:format', notImplemented)
app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
