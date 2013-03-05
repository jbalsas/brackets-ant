/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, browser: true */
/*global $, define, brackets */

define(function (require, exports, module) {
    "use strict";
    
    var AppInit         = brackets.getModule("utils/AppInit"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        FileUtils       = brackets.getModule("file/FileUtils"),
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
        
        $(nodeConnection).on("ant.update", function (evt, data) {
            console.log(data);
        });

        chain(connect, loadAntDomain);
    });
    
    // 
    function _runBuild() {
        var entry   = ProjectManager.getSelectedItem(),
            path    = entry.fullPath.substring(0, entry.fullPath.lastIndexOf("/")),
            file    = entry.name;
        
        var buildPromise = nodeConnection.domains.ant.build(path, file, "")
            .fail(function (err) {
                console.error("[brackets-ant] failed to run ant.build", err);
            })
            .done(function (result) {
                console.log("[brackets-ant] (%s)", result);
            });
        
        return buildPromise;
    }
    
    function _isXML(fileEntry) {
        return fileEntry && fileEntry.name.indexOf(".xml") >= 0;
    }
    
    CommandManager.register("Run main target...", RUN_BUILD, _runBuild);
    
    var contextMenu     = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU),
        buildMenuItem   = null;
    
    $(contextMenu).on("beforeContextMenuOpen", function (evt) {
        if (_isXML(ProjectManager.getSelectedItem())) {
            if (buildMenuItem === null) {
                buildMenuItem = contextMenu.addMenuItem(RUN_BUILD, "", Menus.LAST);
            }
        } else {
            if (buildMenuItem !== null) {
                contextMenu.removeMenuItem(RUN_BUILD);
                buildMenuItem = null;
            }
        }
    });
    
});