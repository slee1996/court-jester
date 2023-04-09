const ivm = require("isolated-vm");

async function runCodeInIsolatedVm(code) {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContextSync();
  const jail = context.global;
  await jail.setSync("global", jail.derefInto());

  const bootstrap = isolate.compileScriptSync(
    "new " +
      function () {
        global.console = {
          log: function () {
            $0.applyIgnored(undefined, arguments, {
              result: { returnIgnored: true },
            });
          },
        };
      }
  );
  await bootstrap.run(context);

  const logCallback = function (...args) {
    console.log(...args);
  };
  await jail.set("$0", new ivm.Reference(logCallback));

  const scriptCode = `(async function() {
    (${code})();
  })();`;

  const script = await isolate.compileScript(scriptCode);

  try {
    await script.run(context, { timeout: 5000 }); // Set a timeout of 5 seconds
  } catch (err) {
    if (
      err.message === "Script execution timed out."
    ) {
      throw new Error("An infinite loop was detected!");
    } else {
      throw err;
    }
  }
}

module.exports = runCodeInIsolatedVm;
