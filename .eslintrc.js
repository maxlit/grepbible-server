module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true, // Add this line
    },
    extends: "eslint:recommended",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    rules: {
        "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }], // Ignore unused vars if prefixed with _
        "no-useless-escape": "error",
    }
};
