const express = require('express')

const app = express()

app.get('/', (req, res) => {
  res.send({message: 'hello world'})
})

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log('Start listening on port ' + port)
})
