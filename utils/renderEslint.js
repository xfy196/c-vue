const fs = require('fs');
const path = require("path");
const sortDependencies = require('./sortDependencies.js');
const deepMerge = require("./deepMerge.js")
const {devDependencies : allEslintDeps} = require('../template/eslint/package.json');

const dependencies = {};
function addEslintDependency(name) {
  dependencies[name] = allEslintDeps[name];
}
addEslintDependency("eslint");
addEslintDependency("eslint-plugin-vue");

// eslint的配置文件
const config = {
  root: true,
  extends: ["plugin:vue/vue3-essential"],
  env: {
    "vue/setup-compiler-macros": true,
  },
};
function connfigureEslint({
  language,
  styleGuide,
  needPrettier,
  needCypress,
  needCypressCT,
}) {
  switch (`${styleGuide}-${language}`) {
    case "default-javascript":
      config.extends.push("eslint:recommended");
      break;
    case "default-typescript":
      addEslintDependency("@vue/eslint-config-typescript");
      config.extends.push(
        "eslint:recommended",
        "@vue/eslint-config-typescript/recommended"
      );
      break;
  }
  if (needPrettier) {
    addEslintDependency("prettier");
    addEslintDependency("@vue/eslint-config-prettier");
    config.extends.push("@vue/eslint-config-prettier");
  }
  if (needCypress) {
    addEslintDependency("eslint-plugin-cypress");
    const cypressOverrides = [
      {
        files: needCypressCT
          ? [
              "**/__tests__/*.spec.{js,ts,jsx,tsx}",
              "cypress/integration/**.spec.{js,ts,jsx,tsx}",
            ]
          : ["cypress/integration/**.spec.{js,ts,jsx,tsx}"],
        extends: ["plugin:cypress/recommended"],
      },
    ];
    config.overrides = cypressOverrides;
  }
  // 生成配置文件
  let configuration = "/* eslint-env node */\n";
  if (styleGuide !== "default" || language !== "javascript" || needPrettier) {
    addEslintDependency("@rushstack/eslint-patch");
    configuration += `require("@rushstack/eslint-patch/modern-module-resolution");\n\n`;
  }
  configuration += `module.exports = ${JSON.stringify(config, undefined, 2)}\n`;
  return {
    dependencies,
    configuration,
  };
}
module.exports =  function renderEslint(
  rootDir,
  { needTypeScript, needCypress, needCypressCT, needPrettier }
) {
  const { dependencies, configuration } = connfigureEslint({
    language: needTypeScript ? "typescript" : "javascript",
    styleGuide: "default",
    needPrettier,
    needCypress,
    needCypressCT,
  });
  // update package.json
  const packageJsonPath = path.resolve(rootDir, "package.json");
  const existingPkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const pkg = sortDependencies(
    deepMerge(existingPkg, {
      scripts: {
        lint: needTypeScript
          ? "eslint . --ext .vue,.ts,.tsx,.js,.jsx,.cts,.mts,.cjs,.mjs --fix --ignore-path .gitignore"
          : "eslint . --ext .vue,.js,.jsx,.cjs,.mjs --fix --ignore-path .gitignore",
      },
      devDependencies: dependencies,
    })
  );
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");
  //   写入eslintrc的配置文件
  const eslintrcPath = path.resolve(rootDir, ".eslintrc.js");
  fs.writeFileSync(eslintrcPath, configuration);
}
