require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors({origin: true}))

app.use('/pci-vecteur', require('./lib/pci-vecteur'))
app.use('/pci-image', require('./lib/pci-image'))
app.use('/cadastre-etalab', require('./lib/cadastre-etalab'))

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log('Start listening on port ' + port)
})
