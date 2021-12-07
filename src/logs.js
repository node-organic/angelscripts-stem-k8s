const findRepoRoot = require('organic-stem-skeleton-find-root')
const { exec } = require('child_process')
const path = require('path')
const exists = require('file-exists')

module.exports = function (angel) {
  angel.on('k8s logs', async function (a) {
    return angel.do('k8s logs -f')
  })
  angel.on(/k8s logs (.*)/, async function (a) {
    const repoRoot = await findRepoRoot()
    const packagejson = require(path.join(process.cwd(), 'package.json'))
    const cellName = packagejson.name
    let query = a.cmdData[1]
    let configPath = `${repoRoot}/.kubeconfig`
    if (!(await exists(configPath))) {
      configPath = null
    }
    if (!query.includes('-l')) {
      query += ` -l app=${cellName}`
    }
    if (!query.includes('--all-containers')) {
      query += ' --all-containers'
    }
    let cmd = `kubectl logs ${query}`
    if (configPath) {
      cmd += ` --kubeconfig ${configPath}`
    }
    console.info('running:', cmd)
    const child = exec(cmd, {
      cwd: process.cwd(),
      maxBuffer: Infinity,
      env: process.env
    })
    child.stderr.pipe(process.stderr)
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)
  }).example('k8s logs -l app=myCell --namespace default --since 10m')
}
