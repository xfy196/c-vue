#! /usr/bin/env node
const fs = require("fs");
const path = require("path");
const minimist = require("minimist");
const prompts = require("prompts");
const { red, green, bold } = require("kolorist");
const banner = require("./utils/banner");
const renderTemplate = require("./utils/renderTemplate");
const renderEslint = require("./utils/renderEslint");
const {
  preOrderDirectoryTraverse,
  postOrderDirectoryTraverse,
} = require("./utils/directoryTraverse");
const generateReadme = require("./utils/generateReadme");
const getCommand = require("./utils/getCommand");

// 验证包名是否可用
function isVaidPackageName(name) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
    name
  );
}
// 转换为可验证的包名
function toValidPackageName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z0-9-~]+/g, "-");
}
// 此目录是否可以安全的覆盖
function canSafeOverwrite(dir) {
  return !fs.existsSync(dir) || fs.readdirSync(dir).length === 0;
}

// 是否为空目录
function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  postOrderDirectoryTraverse(
    dir,
    (dir) => fs.rmdirSync(dir),
    (file) => fs.unlinkSync(file)
  );
}

// 初始
async function init() {
  console.log(`\n${banner}\n`);
  const cwd = process.cwd();
  const argv = minimist(process.argv.slice(2), {
    alias: {
      typescript: ["ts"],
      "with-tests": ["tests"],
      router: ["vue-router"],
    },
    boolean: true,
  });
  const isFeatureFlagsUsed =
    typeof (
      argv.default ??
      argv.ts ??
      argv.jsx ??
      argv.router ??
      argv.pinia ??
      argv.tests ??
      argv.vitest ??
      argv.cypress ??
      argv.eslint
    ) === "boolean";
  let targetDir = argv._[0];
  const defaultProjectName = !targetDir ? "vue-project" : targetDir;
  const forceOverwrite = argv.force;
  let result = {};
  try {
    result = await prompts(
      [
        {
          name: "projectName",
          type: targetDir ? null : "text",
          message: "Project Name:",
          initial: defaultProjectName,
          onState: (state) =>
            (targetDir = String(state.value).trim() || defaultProjectName),
        },
        {
          name: "shouldOverwrite",
          type: () =>
            canSafeOverwrite(targetDir) || forceOverwrite ? null : "confirm",
          message: () => {
            const dirForPrompt =
              targetDir === "."
                ? "Current directory"
                : `Target directory ${targetDir}`;
            return `${dirForPrompt} is not empty. Remove existing files and continue?`;
          },
        },
        {
          name: "overwriteChecker",
          type: (prev, values = {}) => {
            if (values.shouldOverwrite) {
              throw new Error(red("*") + "Operation cancelled");
            }
            return null;
          },
        },
        {
          name: "packageName",
          type: () => (isVaidPackageName(targetDir) ? null : "text"),
          message: "Package Name:",
          initial: () => toValidPackageName(targetDir),
          validate: (dir) =>
            isVaidPackageName(dir) ? true : `Package name ${dir} is invalid`,
        },
        {
          name: "needTypeScript",
          type: () => (isFeatureFlagsUsed ? null : "toggle"),
          message: "Add Typescript support?",
          initial: false,
          active: "Yes",
          inactive: "No",
        },
        {
          name: "needJsx",
          type: () => (isFeatureFlagsUsed ? null : "toggle"),
          message: "Add JSX support?",
          initial: false,
          active: "Yes",
          inactive: "No",
        },
        {
          name: "needVueRouter",
          type: () => (isFeatureFlagsUsed ? null : "toggle"),
          message: "Add Vue Router support?",
          initial: false,
          active: "Yes",
          inactive: "No",
        },
        {
          name: "needPinia",
          type: () => (isFeatureFlagsUsed ? null : "toggle"),
          message: "Add Pinia support?",
          initial: false,
          active: "Yes",
          inactive: "No",
        },
        {
          name: "needVitest",
          type: () => (isFeatureFlagsUsed ? null : "toggle"),
          message: "Add Vitest for Unit Testing",
          initial: false,
          active: "Yes",
          inactive: "No",
        },
        {
          name: "needCypress",
          type: () => (isFeatureFlagsUsed ? null : "toggle"),
          message: (prev, answers) =>
            answers.needVitest
              ? "Add Cypress for E2E testing?"
              : "Add Cypress for both Unit and E2E testing?",
          initial: false,
          active: "Yes",
          inactive: "No",
        },
        {
          name: "needEslint",
          type: () => (isFeatureFlagsUsed ? null : "toggle"),
          message: "Add Eslint support?",
          initial: false,
          active: "Yes",
          inactive: "No",
        },
        {
          name: "needPrettier",
          type: (prev, values = {}) => {
            if (isFeatureFlagsUsed || !values.needEslint) {
              return null;
            }
            return "toggle";
          },
          message: "Add Prettier support?",
          initial: false,
          active: "Yes",
          inactive: "No",
        },
      ],
      {
        onCancel: () => {
          throw new Error(red("*") + "Opreation cancelled");
        },
      }
    );
    const {
      projectName,
      packageName = projectName ?? defaultProjectName,
      shouldOverwrite = argv.force,
      needTypeScript = argv.typescript,
      needJsx = argv.jsx,
      needVueRouter = argv.router,
      needPinia = argv.pinia,
      needCypress = argv.cypress || argv.tests,
      needVitest = argv.vitest || argv.tests,
      needEslint = argv.eslint || argv["eslint-with-prettier"],
      needPrettier = argv["eslint-with-prettier"],
    } = result;
    const needCypressCT = needCypress && !needVitest;
    // 根目录
    const root = path.join(cwd, targetDir);
    if (fs.existsSync(root) && shouldOverwrite) {
      emptyDir(root);
    } else if (!fs.existsSync(root)) {
      // 不存在创建
      fs.mkdirSync(root);
    }
    console.log(`\n Scaffolding project in ${root}...`);
    const pkg = { name: packageName, version: "0.0.0" };
    // 写入package.json
    fs.writeFileSync(
      path.resolve(root, "package.json"),
      JSON.stringify(pkg, null, 2)
    );

    const templateRoot = path.resolve(__dirname, "template");
    // render function
    const render = function render(templateName) {
      const templateDir = path.resolve(templateRoot, templateName);
      renderTemplate(templateDir, root);
    };
    // default template
    render("base");
    // Add Config
    if (needJsx) {
      render("config/jsx");
    }
    if (needVueRouter) {
      render("config/router");
    }
    if (needPinia) {
      render("config/pinia");
    }
    if (needVitest) {
      render("config/vitest");
    }
    if (needCypress) {
      render("config/cypress");
    }
    if (needCypressCT) {
      render("config/cypress-ct");
    }
    if (needTypeScript) {
      render("config/typescript");
      render("tsconfig/base");
      if (needCypress) {
        render("tsconfig/cypress");
      }
      if (needVitest) {
        render("tsconfig/vitest");
      }
    }
    if (needEslint) {
      renderEslint(root, {
        needTypeScript,
        needCypress,
        needCypressCT,
        needPrettier,
      });
    }
    const codeTemplate =
      (needTypeScript ? "typescript-" : "") +
      (needVueRouter ? "router" : "default");
    render(`code/${codeTemplate}`);

    // main.js / main.ts

    if (needPinia && needVueRouter) {
      render("entry/router-and-pinia");
    } else if (needPinia) {
      render("entry/pinia");
    } else if (needVueRouter) {
      render("entry/router");
    } else {
      render("entry/default");
    }
    if (needTypeScript) {
      // js和ts相同配置的替换
      preOrderDirectoryTraverse(
        root,
        () => {},
        (filePath) => {
          if (filePath.endsWith(".js")) {
            const tsFilePath = filePath.replace(/\.js$/, ".ts");
            if (fs.existsSync(tsFilePath)) {
              fs.unlinkSync(filePath);
            } else {
              fs.renameSync(filePath, tsFilePath);
            }
          } else if (path.basename(filePath) === "jsconfig.json") {
            fs.unlinkSync(filePath);
          }
        }
      );
      // 重命名一些文件
      const indexHtmlPath = path.resolve(root, "index.html");
      const indexHtmlContent = fs.readFileSync(indexHtmlPath, "utf-8");
      fs.writeFileSync(
        indexHtmlPath,
        indexHtmlContent.replace("src/main.js", "src/main.ts")
      );
    } else {
      // 移除ts文件
      preOrderDirectoryTraverse(
        root,
        () => {},
        (filePath) => {
          if (filePath.endsWith(".ts")) {
            fs.unlinkSync(filePath);
          }
        }
      );
    }
    // 处理npm/yarn/pnpm包管理文件
    const userAgent = process.env.npm_config_user_agent ?? "";
    const packageManager = /pnpm/.test(userAgent)
      ? "pnpm"
      : /yarn/.test(userAgent)
      ? "yarn"
      : "npm";
    // README文件
    fs.writeFileSync(path.resolve(root, "README.md"),  generateReadme({
      projectName: result.projectName ?? defaultProjectName,
      packageManager,
      needTypeScript,
      needCypress,
      needCypressCT,
      needEslint,
      needVitest,
    }));
    // 生成README内容
   
    console.log(`\nDone. Now run:\n`);
    if (root !== cwd) {
      console.log(`${bold(green(`cd ${path.relative(cwd, root)}`))}`);
    }
    console.log(`${bold(green(getCommand(packageManager, "install")))}`);
    if (needPrettier) {
      console.log(`${bold(green(getCommand(packageManager, "lint")))}`);
    }
    console.log(`${bold(green(getCommand(packageManager, "dev")))}`);
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
}

init().catch((e) => {
  console.error(e);
});
