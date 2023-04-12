const fs = require("fs");

function generateDynamicTestFile(
  testFileName,
  functionName,
  fnToTest,
) {
  const testCode = `const ${functionName} = ${fnToTest}; 
    test('${functionName} should work as expected', () => { 
      expect(${functionName}(1, 1)).toBe(2);
    });`;

  if (fs.existsSync(testFileName)) {
    fs.unlinkSync(testFileName);
  }

  fs.writeFileSync(testFileName, testCode, "utf8");
}

module.exports = generateDynamicTestFile;
