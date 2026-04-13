const {createGeoJSONReadStream, createGeoJSONWriteStream} = require('./geo')

async function mergeGeoJSONFiles(srcFilesStream, destStream, compress = true) {
  console.log(`merging into destination stream`)

  return new Promise((resolve, reject) => {
    const mergedStream = createGeoJSONWriteStream(destStream, compress)
    mergedStream.setMaxListeners(Infinity)

    mergedStream
      .on('error', reject)
      .on('finish', resolve)

    let count = srcFilesStream.length

    if (count === 0) {
      mergedStream.end()
    }

    srcFilesStream.forEach(src => {
      const srcStream = createGeoJSONReadStream(src)
      srcStream.pipe(mergedStream, {end: false})
      srcStream
        .on('error', reject)
        .on('end', () => {
          count--
          if (count === 0) mergedStream.end()
        })
    })
  })
}

module.exports = {mergeGeoJSONFiles}
