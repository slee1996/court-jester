require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");
const Koa = require("koa");
const cors = require("@koa/cors");
const Router = require("@koa/router");
const bodyParser = require("koa-bodyparser");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const configuration = new Configuration({
  organization: process.env.OPEN_AI_ORG_KEY,
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const app = new Koa();
const router = new Router();

app.use(cors());
app.use(bodyParser());

// logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.get("X-Response-Time");
  console.log(`${ctx.method} ${ctx.url} - ${rt}`);
});

// x-response-time
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set("X-Response-Time", `${ms}ms`);
});

function testToRun(fnToTest) {
  return test("1 + 1 should equal 2", () => {
    expect(1 + 1).toBe(2);
  });
}

function extractCodeFromString(str) {
  const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
  const match = codeBlockRegex.exec(str);
  return match && match[1] ? match[1] : null;
}

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

async function promptGpt(storyPrompt) {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a software engineer, your job is to help me generate new functionality, and refactor code that is fed to you. The language you are writing in is javascript. Do not include any example usages in the same code block you provide the code in. This is your prompt:`,
        },
        ...storyPrompt,
      ],
    });

    return completion.data.choices;
  } catch (err) {
    console.error(err);
  }
}

function generateDynamicTestFile(testFileName, functionName, fnToTest) {
  const testCode = `const ${functionName} = ${fnToTest}; 
    test('${functionName} should work as expected', () => { 
      expect(${functionName}(1, 1)).toBe(2);
    });`;

  if (fs.existsSync(testFileName)) {
    fs.unlinkSync(testFileName);
  }

  fs.writeFileSync(testFileName, testCode, "utf8");
}

function getFunctionsFromModule(module) {
  return Object.entries(module)
    .filter(([key, value]) => typeof value === "function")
    .map(([key, value]) => key);
}

// routes
router.post("/", async (ctx) => {
  const chat = await promptGpt(ctx.request.body.prompt);
  const extractedCode = extractCodeFromString(chat[0].message.content);
  const functionCodeWithExport = `${extractedCode}\nmodule.exports = { ${
    extractedCode.match(/function\s+(\w+)/)[1]
  } };`;

  eval(extractedCode);
  fs.writeFileSync("sumFunction.js", functionCodeWithExport, "utf8");
  generateDynamicTestFile("sum.test.js", "sum", extractedCode);

  await runJestTests();

  ctx.body = chat;
});

// response
app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);
console.log("listening on port 3000");
