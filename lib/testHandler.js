const fs = require("fs"); // Or `import fs from "fs";` with ESM

function getTestDir() {
    var cwd = process.cwd();
    return cwd + "\\newmantests";
}

function getCollectionSequenceRecursive(testDir, collectionDirs, index) {
    if (index >= collectionDirs.length) {
        return null;
    }

    var file = testDir + "\\" + collectionDirs[index] + "\\test.json";
    while (!fs.existsSync(file) && index < collectionDirs.length) {
        index++;
        file = testDir + "\\" + collectionDirs[index] + "\\test.json";
    }

    if(index >= collectionDirs.length){
        return null;
    }

    index++;

    return {
        collection: file,
        next: {
            collection: getCollectionSequenceRecursive(testDir, collectionDirs, index)
        }
    }

}

const testHandler = {
    getTestDir: getTestDir,
    getCollectionSequence: function () {
        var testDir = getTestDir();
        var collectionDirs = fs.readdirSync(testDir, { withFileTypes: true })
            .filter(dir => dir.isDirectory())
            .map(dir => dir.name);
        return getCollectionSequenceRecursive(testDir, collectionDirs, 0);
    }
};


module.exports = testHandler;