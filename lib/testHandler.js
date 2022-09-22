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

    var collName = collectionDirs[index];
    index++;
    return {
        name: collName,
        collection: file,
        next: getCollectionSequenceRecursive(testDir, collectionDirs, index)
    }

}

const testHandler = {
    getSingleSequence: function (collDir) {
        var file = getTestDir() + "\\" + collDir + "\\test.json";
        if (!fs.existsSync(file)) {
            return null;
        }
        return {
            name: collDir,
            collection: file,
            next: null
        };
    },
    getTestDir: getTestDir,
    getCollectionSequence: function () {
        var testDir = getTestDir();
        var collectionDirs = fs.readdirSync(testDir, { withFileTypes: true })
            .filter(dir => dir.isDirectory())
            .map(dir => dir.name);
        console.log(collectionDirs);
        return getCollectionSequenceRecursive(testDir, collectionDirs, 0);
    }
};


module.exports = testHandler;