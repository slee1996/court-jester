require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");
const {
  runJestTests,
  extractCodeFromString,
  generateDynamicTestFile,
  getFunctionName,
  runCodeInIsolatedVm,
} = require("./lib");
const Koa = require("koa");
const cors = require("@koa/cors");
const Router = require("@koa/router");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const glob = require("glob");

const configuration = new Configuration({
  organization: process.env.OPEN_AI_ORG_KEY,
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const app = new Koa();
const router = new Router();

app.use(cors());
app.use(bodyParser());

// error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error(err);
    ctx.status = err.status || 500;
    ctx.body = { error: err.message };
    ctx.app.emit("error", err, ctx);
  }
});

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

async function promptGpt(storyPrompt) {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      n: 5,
      messages: [
        {
          role: "system",
          content: `You are a software engineer, your job is to help me generate new functionality, and refactor code that is fed to you. The language you are writing in is javascript. Do not include any example usages in the same code block you provide the code in. Provide only the code in your response. This is your prompt:`,
        },
        ...storyPrompt,
      ],
    });

    return completion.data.choices;
  } catch (err) {
    console.error(err);
  }
}

// routes
router.post("/", async (ctx) => {
  try {
    const chats = await promptGpt(ctx.request.body.prompt);
    const generatedFunctions = new Set();
    const codeExecutionsWereSuccessful = [];

    chats.forEach(async (chat, i) => {
      const extractedCode = extractCodeFromString(chat.message.content);
      const functionName = getFunctionName(extractedCode);

      generatedFunctions.add(functionName);

      const start = Date.now();

      console.log(`Start running ${functionName}-${i} in isolated vm-${i}`);

      let codeExecutionSuccessful = false;

      runCodeInIsolatedVm(extractedCode)
        .then((res) => {
          codeExecutionSuccessful = true;
        })
        .catch((err) => {
          console.error(err);
          ctx.body = err;
        });

      const ms = Date.now() - start;

      console.log(
        `End running ${functionName}-${i} in isolated vm-${i}`,
        `Success: ${codeExecutionSuccessful}`,
        ms + "ms"
      );

      if (codeExecutionSuccessful) {
        const functionCodeWithExport = `${extractedCode}\nmodule.exports = { ${
          extractedCode.match(/function\s+(\w+)/)[1]
        } };`;

        fs.writeFileSync(
          `${functionName}${i}.js`,
          functionCodeWithExport,
          "utf8"
        );
        generateDynamicTestFile(
          `${functionName}${i}.test.js`,
          functionName,
          extractedCode
        );
        codeExecutionsWereSuccessful.push(codeExecutionSuccessful);
      }
    });
    console.log(codeExecutionsWereSuccessful);

    if (codeExecutionsWereSuccessful.every((success) => success === true)) {
      await runJestTests();
      ctx.body = chats;
    }
  } catch (err) {
    ctx.body = err;
  }
});

// response
app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);
console.log("listening on port 3000");
