/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, browser: true */
/*global $, define, brackets */

define(function (require, exports, module) {
    "use strict";
    
    var AppInit         = brackets.getModule("utils/AppInit"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        Menus           = brackets.getModule("command/Menus"),
        NodeConnection  = brackets.getModule("utils/NodeConnection"),
        ProjectManager  = brackets.getModule("project/ProjectManager");
    
    var RUN_BUILD    = "ant_build_cmd";
    var nodeConnection;
    
    // Helper function that chains a series of promise-returning
    // functions together via their done callbacks.
    function chain() {
        var functions = Array.prototype.slice.call(arguments, 0);
        if (functions.length > 0) {
            var firstFunction = functions.shift();
            var firstPromise = firstFunction.call();
            firstPromise.done(function () {
                chain.apply(null, functions);
            });
        }
    }
    
    AppInit.appReady(function () {
        
        nodeConnection = new NodeConnection();
        
        // Helper function that tries to connect to node
        function connect() {
            var connectionPromise = nodeConnection.connect(true);
            
            connectionPromise.fail(function () {
                console.error("[brackets-ant] failed to connect to node");
            });
            
            return connectionPromise;
        }
        
        // Helper function that loads our domain into the node server
        function loadAntDomain() {
            var path        = ExtensionUtils.getModulePath(module, "node/AntDomain"),
                loadPromise = nodeConnection.loadDomains([path], true);
            
            loadPromise.fail(function () {
                console.log("[brackets-ant] failed to load ant domain");
            });
            
            return loadPromise;
        }

        chain(connect, loadAntDomain);
    });
    
    // 
    function _runBuild() {
        var path         = ProjectManager.getProjectRoot().fullPath;
        
        var buildPromise = nodeConnection.domains.ant.build(path, "build.xml", "compile")
            .fail(function (err) {
                console.error("[brackets-ant] failed to run ant.build", err);
            })
            .done(function (result) {
                console.log("[brackets-ant] (%s)", result);
            });
        
        return buildPromise;
    }
    
    CommandManager.register("Run build", RUN_BUILD, _runBuild);

    var menu = Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU);
    menu.addMenuItem(RUN_BUILD, "", Menus.LAST);
    
});