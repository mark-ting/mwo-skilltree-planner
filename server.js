const express = require('express')
const path = require('path')

const app = express()
let port = 3000

const src = path.join(__dirname, '/public')
app.use(express.static(src))

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
