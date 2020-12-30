function quizAnswerHashFunction(IV, input) {
  if (!input || !IV) return null;
  const nonce = parseInt(IV.substr(IV.length - 2), 16);
  const t = input.split('').reduce((acc, char) => acc + char.charCodeAt(0), nonce);
  return t.toString();
}
