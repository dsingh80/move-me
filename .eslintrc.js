/**
 * NOTE: combined general & node manually
 */
/**
 * .eslintrc.general.js
 * Place this at the highest level of the repo, it applies to all javascript written: server and client side.
 *
 * NOTE: Until we start including these in our main repos, I'm going to include the install dependencies here:
 *   `npm install --save-dev eslint`
 */
/**
 * .eslintrc.node.js
 * Place this inside the highest-level dir that contains node code.
 * It is designed to work in conjunction with the `.eslintrc.general.js` file.
 *
 * NOTE: Until we start including these in our main repos, I'm going to include the install dependencies here:
 *   `npm install --save-dev eslint-plugin-node`
 */

module.exports = {
  env: {
    'es6': true,
    'node': true
  },
  parserOptions: {
    'ecmaVersion': 10,
    'sourceType': 'module'
  },
  plugins: ['node'],
  extends: ['eslint:recommended', 'plugin:node/recommended'],
  rules: {
    // enable additioanl rules
    'indent': ['error', 2, { 'SwitchCase': 1 }],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],

    // override default options for rules from base configurations
    'comma-dangle': ['error', 'never'],  // will auto fix (I.E. is dumb it's the only reason this is even a concern)
    'no-template-curly-in-string': ['warn'],
    'block-scoped-var': ['error'],
    'curly': ['error', 'multi-line'],
    'dot-location': ['error', 'property'],
    'dot-notation': ['error'], // will auto fix
    'no-else-return': ['error'], // will auto fix
    'no-eval': ['warn'],
    'no-floating-decimal': ['warn'], // will auto fix
    'no-labels': ['error'],
    'no-loop-func': ['warn'],
    'no-new': ['error'], // if it turns out there's a reason for this, switch to warn
    'no-new-wrappers': ['error'],
    'callback-return': ['warn'],
    'no-tabs': 'error',
    'no-whitespace-before-property': 'error',
    'space-before-function-paren': ['error', 'never'],
    'no-unused-vars': ['warn', { 'args': 'none' }],  // It is sometimes useful to leave in unused var's so the next dev knows how info is there. EX: `index` on an iterator function. It might not be used, but might be good to let someone know it is an option.
    'no-console': ['error', { allow: ['warn', 'error'] }],

    // style prefences (non functional, always warn, probably will auto fix)
    'array-bracket-spacing': ['warn', 'never'],
    'block-spacing': ['warn', 'always'],
    'brace-style': ['warn', 'stroustrup', { 'allowSingleLine': true }],
    'comma-spacing': ['warn', { 'before': false, 'after': true }],
    'computed-property-spacing': ['warn', 'never'],
    'func-call-spacing': ['warn', 'never'],
    'key-spacing': ['warn', { 'beforeColon': false, 'afterColon': true }],
    'keyword-spacing': ['warn', { 'after': true }],
    'space-before-blocks': ['warn', 'always'],
    'max-nested-callbacks': ['warn', 10],
    'multiline-comment-style': 'off',
    'no-lonely-if': 'warn',
    'no-multi-assign': 'warn',
    'no-trailing-spaces': 'warn',
    'no-unneeded-ternary': 'warn',
    'object-curly-spacing': ['warn', 'always', { 'arraysInObjects': true }],
    'operator-assignment': ['warn', 'always'],
    'operator-linebreak': ['warn', 'before'],
    'spaced-comment': ['warn', 'always'],
    'eol-last': ['error', 'never'],

    // node rules
    'node/exports-style': ['error', 'module.exports'],
    'node/no-unsupported-features/es-syntax': ['error'],
    'node/no-unpublished-require': 'warn',
    'no-console': 'off', // overrides general setting typically
    'no-cond-assign': 'off'

  },
};
