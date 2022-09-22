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
    // while (!fs.existsSync(file) && index < collectionDirs.length) {
    //     index++;
    //     file = testDir + "\\" + collectionDirs[index] + "\\" + collectionFileName;
    // }
    // if (index >= collectionDirs.length) {
    //     return null;
    // }

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
    let variableFilePath = collectionDir + "\\variable.json";
    collObj.variable = toCollectionJsonVariables(variableFilePath);
    collObj.auth = toCollectionJsonAuth(collectionDir + "\\auth.json");

    let variables = readObjFromJson(variableFilePath);
    collObj.item = toCollectionJsonItem(collectionDir, variables);

    writeJsonFormatted(collectionDir + "\\" + collectionFileName, collObj);
}

function toCollectionJsonItem(collectionDir, variables) {
    //get directories
    var items = [];
    //foreach dir 
    toCollectionJsonItemRecursive(collectionDir, items, variables);
    // check if has request
    // add to items if yes
    // check dir dirs
    return items;
}
function toCollectionJsonItemRecursive(collectionDir, items, variables) {
    if (items == undefined) {
        return;
    }
    var dirs = getDirectories(collectionDir);
    dirs.forEach(dir => {
        var item = {
            name: dir,
        };
        var requestFile = collectionDir + "\\" + dir + "\\request.json";
        if (fs.existsSync(requestFile)) {
            let request = readObjFromJson(requestFile);
            request.url = {
                raw: request.url,
                host: [
                    getHost(request.url, variables),
                ],
                path: getPath(request.url, variables),
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
        toCollectionJsonItemRecursive(collectionDir + "\\" + dir, childItems, variables);
        if (childItems.length > 0) {
            item.item = childItems;
        }
        items.push(item);
    });
}

function getHost(url, variables) {
    var actUrl = getStrSearchReplacedVariables(url, variables);
    var url = urlParser.parse(actUrl);
    var actHost = url.host;
    var urlVariable = variables.filter(v => v.value == "https://" + actHost);
    if (urlVariable.length == 1) {//in case of the host being found as variable
        actHost = "{{" + urlVariable[0].key + "}}";
    }

    return actHost;
}

function getStrSearchReplacedVariables(str, variables) {
    let actStr = str;
    variables.forEach(v => {
        actStr = actStr.replaceAll("{{" + v.key + "}}", v.value);
    });

    return actStr;
}


function getPath(url, variables) {
    var actUrl = getStrSearchReplacedVariables(url, variables);
    var path = urlParser.parse(actUrl).path;
    var paths = path.split("/").filter(p => p.length > 0);
    var pathsAsVariables = [];
    paths.forEach(p => {
        var variableMatches = variables.filter(v => v.value == p);
        if (variableMatches.length == 1) {
            pathsAsVariables.push("{{" + variableMatches[0].key + "}}");
        }
        else {
            pathsAsVariables.push(p);
        }
    });

    return pathsAsVariables;
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
    var name = collObj.info.name;
    var workDir = destination + "\\" + toFileFriendly(name);
    fs.mkdirSync(workDir);
    var fileVariables = toFileVariables(collObj);
    writeJsonFormatted(workDir + "\\variable.json", fileVariables);
    var fileAuth = toFileAuth(collObj);
    writeJsonFormatted(workDir + "\\auth.json", fileAuth);
    recursiveWriteRequestFiles(workDir, collObj.item);
}

function toFileFriendly(str){
    return str.replaceAll(/[/\\?%*:|"<>]/g, "_");
}


function recursiveWriteRequestFiles(currentDir, items) {
    if (items == undefined) {
        return;
    }

    for(var i = 0; i < items.length;i++){
        let item = items[i];
        let dir = currentDir + "\\" + i + '_'+ toFileFriendly(item.name);
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
    }
}

function toJsTestFile(events) {
    if (events == undefined) {
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
    var jsonBody = request?.body?.raw;
    if (jsonBody == undefined || jsonBody.length < 1) {
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