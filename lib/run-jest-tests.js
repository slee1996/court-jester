const { spawn } = require("child_process");

async function runJestTests() {
  return new Promise((resolve, reject) => {
    const jestProcess = spawn("yarn", ["test"]);

    jestProcess.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    jestProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    jestProcess.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      resolve(code);
    });
  });
}

module.exports = runJestTests;
