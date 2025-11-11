// Prevent Node.js from trying to parse CSS files in serverless functions
if (require && require.extensions) {
  require.extensions[".css"] = () => {};
  require.extensions[".scss"] = () => {};
  require.extensions[".less"] = () => {};
}
console.log("🧩 CSS imports will be ignored for Node runtime");
