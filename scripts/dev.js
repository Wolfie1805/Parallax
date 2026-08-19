import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Determine Python executable path (favor virtual environment if present)
function getPythonExecutable() {
  const isWin = process.platform === 'win32'
  const venvWin = path.join(rootDir, 'backend', 'venv', 'Scripts', 'python.exe')
  const venvUnix = path.join(rootDir, 'backend', 'venv', 'bin', 'python')

  if (isWin && fs.existsSync(venvWin)) return `"${venvWin}"`
  if (!isWin && fs.existsSync(venvUnix)) return `"${venvUnix}"`
  return isWin ? 'python' : 'python3'
}

const pythonExec = getPythonExecutable()
const npmExec = process.platform === 'win32' ? 'npm.cmd' : 'npm'

console.log('\x1b[36m%s\x1b[0m', '=====================================================')
console.log('\x1b[36m%s\x1b[0m', ' 🚀 Starting PARALLAX Full-Stack Telemetry System    ')
console.log('\x1b[36m%s\x1b[0m', '=====================================================')
console.log(`🔹 Python Executable : ${pythonExec}`)
console.log(`🔹 Frontend Dir     : ${path.join(rootDir, 'frontend')}`)
console.log('')

// 1. Spawn FastAPI Backend
const backendProcess = spawn(
  `${pythonExec} -u -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`,
  { cwd: rootDir, stdio: ['inherit', 'pipe', 'pipe'], shell: true }
)

backendProcess.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n')
  lines.forEach((line) => {
    if (line) console.log(`\x1b[36m[BACKEND]\x1b[0m ${line}`)
  })
})

backendProcess.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n')
  lines.forEach((line) => {
    if (line) console.log(`\x1b[33m[BACKEND]\x1b[0m ${line}`)
  })
})

// 2. Spawn Vite Frontend
const frontendProcess = spawn(
  `${npmExec} run dev`,
  { cwd: path.join(rootDir, 'frontend'), stdio: ['inherit', 'pipe', 'pipe'], shell: true }
)

frontendProcess.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n')
  lines.forEach((line) => {
    if (line) console.log(`\x1b[32m[FRONTEND]\x1b[0m ${line}`)
  })
})

frontendProcess.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n')
  lines.forEach((line) => {
    if (line) console.log(`\x1b[31m[FRONTEND]\x1b[0m ${line}`)
  })
})

// Graceful cleanup on Ctrl+C / exit
function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down PARALLAX services...')
  if (!backendProcess.killed) backendProcess.kill()
  if (!frontendProcess.killed) frontendProcess.kill()
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('exit', cleanup)
