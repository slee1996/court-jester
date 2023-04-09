module.exports = {
  runJestTests: require("./run-jest-tests"),
  extractCodeFromString: require("./extract-code-from-string"),
  generateDynamicTestFile: require("./generate-dynamic-test-file"),
  getFunctionName: require("./get-function-name"),
  runTestsInIsolatedVm: require("./run-tests-in-isolated-vm"),
  runCodeInIsolatedVm: require("./run-code-in-isolated-vm"),
};
