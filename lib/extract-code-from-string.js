function extractCodeFromString(str) {
  const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
  const match = codeBlockRegex.exec(str);
  return match && match[1] ? match[1] : null;
}

module.exports = extractCodeFromString;
