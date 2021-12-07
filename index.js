module.exports = function (angel) {
  require('./src/k8s')(angel)
  require('./src/logs')(angel)
}
