function getFunctionName(functionString) {
  const functionNameRegex = /function\s+(\w+)/;
  const match = functionNameRegex.exec(functionString);

  if (match && match[1]) {
    return match[1];
  } else {
    return null;
  }
}

module.exports = getFunctionName;
