const { Atem } = require('atem-connection')

const atem = new Atem()
const ATEM_IP = '192.168.0.78'

atem.on('error', (err) => {
  console.error('ATEM ERROR:', err)
})

atem.on('connected', () => {
  console.log('ATEM CONNECTED ✅')
  console.log('Inspecting input properties...\n')

  const inputs = atem.state?.inputs || {}

  for (const [id, input] of Object.entries(inputs)) {
    console.log(`INPUT ${id}`)
    console.dir(input, { depth: 5 })
    console.log('-----------------------------')
  }

  setTimeout(() => {
    process.exit(0)
  }, 1000)
})

console.log('Connecting to ATEM:', ATEM_IP)
atem.connect(ATEM_IP)
