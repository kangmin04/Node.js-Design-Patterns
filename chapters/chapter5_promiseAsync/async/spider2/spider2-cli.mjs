import { spider } from './spider2.mjs'

const url = process.argv[2]
const maxDepth = Number.parseInt(process.argv[3], 10) || 1

  try {
    await spider(url, maxDepth)
    console.log('------------')
    console.log('download completed')
    console.log('------------')
  } catch (err) {
    console.error(err); 
    process.exit(1);
  }
  