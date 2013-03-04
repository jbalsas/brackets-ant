/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, node: true */
/*global brackets */

(function () {
    
    "use strict";
    
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
    }
    
    /**
     *
     */
    function init(DomainManager) {
        if (!DomainManager.hasDomain("ant")) {
            DomainManager.registerDomain("ant", {major: 0, minor: 1});
        }
        
        DomainManager.registerCommand(
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
    }
    
    exports.init = init;
    
}());