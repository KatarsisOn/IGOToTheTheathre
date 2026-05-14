const store = require('../db/store')
const { loadDemoExternalBatch } = require('../services/dataLoader.service')

async function run() {
  await store.ensure()
  const result = await loadDemoExternalBatch()
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
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
