const {Router} = require('express')
const {notImplemented} = require('./middlewares')

const app = new Router()

app.get('/departements/:codeDepartement/tiff', notImplemented)
app.get('/communes/:codeCommune/tiff', notImplemented)
app.get('/feuilles/:codeFeuille/tiff', notImplemented)
app.get('/epci/:codeEPCI/tiff', notImplemented)

module.exports = app
