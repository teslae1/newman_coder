const { Console } = require("console");
const urlParser = require('url');
const fs = require("fs"); // Or `import fs from "fs";` with ESM
const { request } = require("http");
const { v4: uuidv4 } = require('uuid');
const collectionFileName = "collection.json";



function getTestDir() {
    var cwd = process.cwd();
    return cwd + "\\newmantests";
}

function getCollectionSequenceRecursive(testDir, collectionDirs, index) {
    if (index >= collectionDirs.length) {
        return null;
    }

    var file = testDir + "\\" + collectionDirs[index] + "\\" + collectionFileName;
    while (!fs.existsSync(file) && index < collectionDirs.length) {
        index++;
        file = testDir + "\\" + collectionDirs[index] + "\\" + collectionFileName;
    }
    if (index >= collectionDirs.length) {
        return null;
    }

    var collectionDir = testDir + "\\" + collectionDirs[index];
    var collName = collectionDirs[index];
    updateCollectionJsonBasedOnFiles(collectionDir, collName);
    index++;
    return {
        name: collName,
        collection: file,
        next: getCollectionSequenceRecursive(testDir, collectionDirs, index)
    }
}

function updateCollectionJsonBasedOnFiles(collectionDir, collectionName) {
    let collObj = {};
    collObj.info = {
        _postman_id: uuidv4(),
        name: collectionName,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    };
    collObj.variable = toCollectionJsonVariables(collectionDir + "\\variable.json");
    collObj.auth = toCollectionJsonAuth(collectionDir + "\\auth.json");

    collObj.item = toCollectionJsonItem(collectionDir);

    writeJsonFormatted(collectionDir + "\\" + collectionFileName, collObj);
}

function toCollectionJsonItem(collectionDir) {
    //get directories
    var items = [];
    //foreach dir 
    toCollectionJsonItemRecursive(collectionDir, items);
    // check if has request
    // add to items if yes
    // check dir dirs
    return items;
}
function toCollectionJsonItemRecursive(collectionDir, items) {
    if (items == undefined) {
        return;
    }
    var dirs = getDirectories(collectionDir);
    dirs.forEach(dir => {
        var item = {
            name: dir,
        };
        console.log("Recursive found dir: " + dir);
        var requestFile = collectionDir + "\\" + dir + "\\request.json";
        if (fs.existsSync(requestFile)) {
            console.log("REQUEST EXISTS");
            let request = readObjFromJson(requestFile);
            request.url = {
                raw: request.url,
                host: [
                    getHost(request.url),
                ],
                path: getPath(request.url),
            };

            request.body = {
                mode: "raw",
                raw: fs.readFileSync(collectionDir + "\\" + dir + "\\body.json", 'utf8'),
                options: {
                    raw: {
                        language: "json"
                    }
                }
            }
            item.request = request;

            item.event = toCollectionJsonEvent(collectionDir + "\\" + dir);

        }
        var childItems = [];
        toCollectionJsonItemRecursive(collectionDir + "\\" + dir, childItems);
        if (childItems.length > 0) {
            item.item = childItems;
        }
        items.push(item);
    });
}

function getHost(url, variables) {
    //if is actual path 
    // https://admin.com/api/v1
    var actUrl = url;
    variables.forEach(v => {
        actUrl//replace key with val
    });
    // get domain part 
    //search replace reverse
    //insert

    return url;
}

function getPath(url, variables) {
    urlParser.parse(url).path.split("/");
}

function toCollectionJsonEvent(collectionDir) {
    let testJs = fs.readFileSync(collectionDir + "\\test.js", 'utf8');
    let testJsArr = testJs.split('\r');
    let testJsArrWithLinebreaks = [];
    testJsArr.forEach(line => {
        if (line.length > 0) {
            testJsArrWithLinebreaks.push(line + "\r");
        }
    });
    return [
        {
            listen: "test",
            script: {
                exec: testJsArrWithLinebreaks,
                type: "text/javascript123"
            }
        }
    ];
}

function toCollectionJsonAuth(authFile) {
    return readObjFromJson(authFile);
}

function toCollectionJsonVariables(variableFile) {
    return readObjFromJson(variableFile);
}

function readObjFromJson(file) {
    var json = fs.readFileSync(file, 'utf8');
    return JSON.parse(json);
}


function getFiles(collection, destination) {
    if (!fs.existsSync(collection)) {
        console.log("No collection json found at: " + collection);
        return;
    }

    var collObj = JSON.parse(fs.readFileSync(collection, 'utf8'));
    var fileVariables = toFileVariables(collObj);
    writeJsonFormatted(destination + "\\variable.json", fileVariables);
    var fileAuth = toFileAuth(collObj);
    writeJsonFormatted(destination + "\\auth.json", fileAuth);
    recursiveWriteRequestFiles(destination, collObj.item);
}


function recursiveWriteRequestFiles(currentDir, items) {
    if (items == undefined) {
        return;
    }

    items.forEach(item => {
        let dir = currentDir + "\\" + item.name;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        let request = item.request;
        if (request != undefined) {
            var fileBody = toFileBody(request);
            writeJsonFormatted(dir + "\\body.json", fileBody);
            var fileRequest = toFileRequest(request);
            writeJsonFormatted(dir + "\\request.json", fileRequest);
            var jsTestFile = toJsTestFile(item.event);
            fs.writeFileSync(dir + "\\test.js", jsTestFile);
        }

        recursiveWriteRequestFiles(dir, item.item);
    });
}

function toJsTestFile(events) {
    if (events == undefined) {
        console.log("NO EVENTS");
        return "";
    }

    var testEvents = events.filter(e => e.script.type == "text/javascript");
    return testEvents[0].script.exec.join("");
}

function toFileRequest(request) {
    let fileRequest = {
        //without body
        method: request.method,
        header: request.header,
        url: request.url.raw
    };

    return fileRequest;
}

//Format of body from collection 
//{
//    "mode": "raw",
//    "raw": "{}",
//    "options": {
//        "raw": {
//            "language": "json"
//        }
//    }
//}
function toFileBody(request) {
    var jsonBody = request.body.raw;
    if (jsonBody == null) {
        return {};
    }

    return JSON.parse(jsonBody);
}

function writeJsonFormatted(path, content) {
    var json = JSON.stringify(content, null, 4);
    fs.writeFileSync(path, json);
}

function toFileVariables(collObj) {
    return collObj.variable;
}

function toFileAuth(collObj) {
    return collObj.auth;
}

function toJsonBody(collObj) {

}

function getDirectories(parentDir) {
    return fs.readdirSync(parentDir, { withFileTypes: true })
        .filter(dir => dir.isDirectory())
        .map(dir => dir.name);
}

const testHandler = {
    getFiles: getFiles,
    getSingleSequence: function (collDir) {
        var collectionDir = getTestDir() + "\\" + collDir;
        var file = collectionDir + "\\" + collectionFileName;

        updateCollectionJsonBasedOnFiles(collectionDir, collDir);
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
        return getCollectionSequenceRecursive(testDir, collectionDirs, 0);
    }
};

module.exports = testHandler;