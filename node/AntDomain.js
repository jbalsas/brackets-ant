/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, node: true */
/*global brackets */

(function () {
    
    "use strict";
    
    var _domainManager = null;
    
    /**
     * 
     */
    function cmdBuild(path, file, target, callback) {
        var exec    = require('child_process').exec,
            cmd     = "ant",
            child;

        if (file) {
            cmd += " -buildfile " + file;
        }
        
        if (target) {
            cmd += " " + target;
        }
        
        if (path) {
            process.chdir(path);
        }
                
        child = exec(cmd, function (error, stdout, stderr) {
            callback(error, stdout);
        });
        
        child.stdout.on("data", function (data) {
            _domainManager.emitEvent("ant", "update", [data]);
        });
    }
    
    /**
     *
     */
    function init(domainManager) {
        _domainManager = domainManager;
        
        if (!_domainManager.hasDomain("ant")) {
            _domainManager.registerDomain("ant", {major: 0, minor: 1});
        }
        
        _domainManager.registerCommand(
            "ant",
            "build",
            cmdBuild,
            true,
            "Runs an ant target on the specified build file",
            ["path", "file", "target"],
            [{name: "result",
                type: "string",
                description: "The result of the execution"}]
        );
        
        _domainManager.registerEvent(
            "ant",
            "update",
            [{name: "data", type: "string"}]
        );
    }
    
    exports.init = init;
    
}());