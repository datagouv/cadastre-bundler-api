const {Router} = require('express')
const {notImplemented, validFormat} = require('./middlewares')

const app = new Router()

app.use(validFormat(['geojson', 'geojson-gz']))

app.get('/departements/:codeDepartement/:format', notImplemented)
app.get('/communes/:codeCommune/:format', notImplemented)
app.get('/epci/:codeEPCI/:format', notImplemented)

module.exports = app
