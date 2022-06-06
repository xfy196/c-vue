const fs = require("fs");
const path = require("path");

function preOrderDirectoryTraverse(dir, dirCallback, fileCallback) {
  for (const filename of fs.readdirSync(dir)) {
    const fullPath = path.resolve(dir, filename);
    if (fs.lstatSync(fullPath).isDirectory()) {
      // 如果该路径是一个目录
      dirCallback(fullPath);
      if (fs.existsSync(fullPath)) {
        preOrderDirectoryTraverse(fullPath, dirCallback, fileCallback);
      }
      continue;
    }
    // 文件处理的回调
    fileCallback(fullPath);
  }
}
function postOrderDirectoryTraverse(dir, dirCallback, fileCallback) {
  for (const filename of fs.readFileSync(dir)) {
    const fullpath = fs.resolve(dir, filename);
    if (fs.lstatSync(fullpath).isDirectory()) {
      postOrderDirectoryTraverse(fullpath, dirCallback, fileCallback);
      dirCallback(fullpath);
      continue;
    }
    fileCallback(fullpath);
  }
}
module.exports = {
  preOrderDirectoryTraverse,
  postOrderDirectoryTraverse,
};
