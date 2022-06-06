const fs  = require("fs")
const path = require("path")
const sortDependencies = require("./sortDependencies.js")
const deepMerge = require("./deepMerge.js")
function renderTemplate(src, dest){
    // src的状态
    const stats = fs.statSync(src)
    if(stats.isDirectory()){
        if(path.basename(src) === "node_modules"){
            return
        }
        fs.mkdirSync(dest, {recursive: true})
        for(const file of fs.readdirSync(src)){
            renderTemplate(path.resolve(src, file), path.resolve(dest, file))
        }
        return
    }
    const filename = path.basename(src)
    if(filename === 'package.json' && fs.existsSync(dest)){
        const existing = JSON.parse(fs.readFileSync(dest))
        const newPackage = JSON.parse(fs.readFileSync(src))
        // 合并package.json
        const pkg = sortDependencies(deepMerge(existing, newPackage))
        fs.writeFileSync(dest, JSON.stringify(pkg, null, 2))
        return
    }
    if(filename.startsWith("_")){
        dest = path.resolve(path.dirname(dest), filename.replace(/^_/, '.'))
    }
    fs.copyFileSync(src, dest)
}
module.exports = renderTemplate