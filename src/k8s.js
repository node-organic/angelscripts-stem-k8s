const findRepoRoot = require('organic-stem-skeleton-find-root')
const loadDna = require('organic-dna-repo-loader')
const { selectBranch } = require('organic-dna-branches')
const { exec } = require('child_process')
const YAML = require('yaml')
const { forEachSeries } = require('p-iteration')
const exists = require('file-exists')
const path = require('path')
const { getCell } = require('organic-dna-cells-info')

module.exports = function (angel) {
  angel.on(/k8s yaml (.*)/, async function (a) {
    const repoRoot = await findRepoRoot()
    const packagejson = require(path.join(process.cwd(), 'package.json'))
    const rootDNA = await loadDna({ root: repoRoot })
    const cellInfo = getCell(rootDNA, packagejson.name)
    const cellDnaBranch = `${a.cmdData[1]}`
    const cellBranches = cellDnaBranch.split(',')
    cellBranches.forEach(function (branchPath) {
      const value = selectBranch(cellInfo.dna, branchPath)
      if (cellBranches.length > 1) {
        console.log('----')
      }
      console.log(YAML.stringify(value, null, 2))
    })
  }).example('k8s yaml k8s.deployment')
  angel.on(/k8s (apply|delete|get|describe) (.*)/, async function (a) {
    const kubeCmd = a.cmdData[1]
    const repoRoot = await findRepoRoot()
    const packagejson = require(path.join(process.cwd(), 'package.json'))
    const rootDNA = await loadDna({ root: repoRoot })
    const cellInfo = getCell(rootDNA, packagejson.name)
    const cellDnaBranch = `${a.cmdData[2]}`
    let configPath = `${repoRoot}/.kubeconfig`
    if (!(await exists(configPath))) {
      configPath = null
    }
    const cellDnaBranches = cellDnaBranch.split(',')
    await forEachSeries(cellDnaBranches, async function (branchPath) {
      try {
        const branch = selectBranch(cellInfo.dna, branchPath)
        return kubectlBranch({ repoRoot, configPath, kubeCmd, branch, branchPath })
      } catch (e) {
        console.error(e, cellInfo.dna, branchPath)
      }
    })
  }).example('k8s apply k8s.deployment')
}

const kubectlBranch = function ({ repoRoot, configPath, kubeCmd, branch, branchPath }) {
  let cmd = `kubectl ${kubeCmd} -f -`
  if (configPath) {
    cmd += ` --kubeconfig ${configPath} `
  }
  console.log(`[running] ${kubeCmd} at ${branchPath} > ${cmd}`)
  const child = exec(cmd, {
    cwd: repoRoot,
    maxBuffer: Infinity,
    env: process.env
  })
  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)
  child.stdin.write(YAML.stringify(branch))
  child.stdin.end()
  return new Promise((resolve, reject) => {
    child.on('exit', function (code) {
      if (code === 0) return resolve()
      reject(new Error('failed to spawn:' + cmd))
    })
  })
}
