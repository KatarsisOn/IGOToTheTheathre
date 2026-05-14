const store = require('../db/store')
const { loadDemoExternalBatch } = require('../services/dataLoader.service')

store.ensure()

const result = loadDemoExternalBatch()
console.log(
  JSON.stringify(
    {
      imported: result.imported.length,
      duplicates: result.duplicates.length,
      duplicateTitles: result.duplicates,
    },
    null,
    2,
  ),
)
