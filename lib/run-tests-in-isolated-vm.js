const ivm = require("isolated-vm");
const fs = require("fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);

async function runTestsInIsolatedVm(testFilePath) {
  const jestContent = await readFile(require.resolve("jest"), "utf8");
  const testFileContent = await readFile(testFilePath, "utf8");

  const getTestEnvWrapper = function () {
    const TestScheduler = require('@jest/core').TestScheduler;
    return new TestScheduler().getTestEnv({});
  };
  const getTestEnvWrapperRef = new ivm.Reference(getTestEnvWrapper);
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContextSync();
  const jail = context.global;

  jail.setSync("global", jail.derefInto());

  // Redirect console.log and console.error from the isolated context to the main context
  const logCallback = new ivm.Reference(function (msg) {
    console.log(msg);
  });

  const errorCallback = new ivm.Reference(function (msg) {
    console.error(msg);
  });

  await context.evalClosureSync(
    `
    globalThis.console = {
      log: function(msg) { $0.applySync(null, [msg]); },
      error: function(msg) { $1.applySync(null, [msg]); },
    };
  `,
    [logCallback, errorCallback],
    { arguments: { reference: true } }
  );

  await context.evalSync(jestContent, { timeout: 10000 });

  await context.evalClosureSync(
    `
      const getTestEnvWrapper = $0.deref();
      const environment = getTestEnvWrapper();

      Object.assign(globalThis, environment);
    `,
    [getTestEnvWrapperRef],
    { arguments: { reference: true } }
  );

  await context.evalSync(testFileContent, { timeout: 10000 });

  const script = isolate.compileScriptSync('require("jest").run();');
  await script.run(context, { timeout: 10000 });
}

module.exports = runTestsInIsolatedVm;
