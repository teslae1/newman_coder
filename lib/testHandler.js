const fs = require("fs"); // Or `import fs from "fs";` with ESM

function getTestDir() {
    var cwd = process.cwd();
    return cwd + "\\newmantests";
}

const testHandler = {
    getTestDir: getTestDir,
    getTestCollections: function () {
        //col
        // variables
        // request
        // request
        // test.json
        var testDir = getTestDir();
        var collectionDirs = fs.readdirSync(testDir, { withFileTypes: true })
            .filter(dir => dir.isDirectory())
            .map(dir => dir.name);
        var testFiles = [];
        collectionDirs.forEach(collDir => {
            var file = testDir + "\\" + collDir + "\\test.json";
            if (!fs.existsSync(file)) {
                return;
            }
            testFiles.push(file);
        })

        return testFiles;
    }
};


module.exports = testHandler;