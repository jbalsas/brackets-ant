/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, browser: true */
/*global $, define, brackets */

define(function (require, exports, module) {
    "use strict";
    
    var AppInit             = brackets.getModule("utils/AppInit"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        FileIndexManager    = brackets.getModule("project/FileIndexManager"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        Menus               = brackets.getModule("command/Menus"),
        NativeFileSystem    = brackets.getModule("file/NativeFileSystem"),
        NodeConnection      = brackets.getModule("utils/NodeConnection"),
        ProjectManager      = brackets.getModule("project/ProjectManager");
    
    var RUN_BUILD       = "ant_build_cmd";
    var SHOW_ANT_PANEL  = "show_ant_panel_cmd";
    var TARGET_REGEXP   = new RegExp("(<target name=\"(([^\"])*))+", "img");
    var nodeConnection;
    
    var contextMenu     = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU),
        menuItems       = [],
        buildMenuItem   = null;
    
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
    
    function _isXML(fileEntry) {
        return fileEntry && fileEntry.name.indexOf(".xml") >= 0;
    }
    
    function _isAntBuild(fileEntry) {
        
        var checkBuildPromise = new $.Deferred();
        
        FileUtils.readAsText(fileEntry).done(function (rawText) {
            if (TARGET_REGEXP.test(rawText)) {
                var match   = null,
                    targets = [];
                
                while ((match = TARGET_REGEXP.exec(rawText)) !== null) {
                    targets.push(match[2]);
                }
                
                checkBuildPromise.resolve(targets);
            } else {
                checkBuildPromise.reject();
            }
        }).fail(function (err) {
            checkBuildPromise.reject(err);
        });
        
        return checkBuildPromise.promise();
    }
    
    // 
    function _runBuild(target) {
        var entry   = ProjectManager.getSelectedItem(),
            path    = entry.fullPath.substring(0, entry.fullPath.lastIndexOf("/")),
            file    = entry.name;
        
        _isAntBuild(entry).done(function () {
            nodeConnection.domains.ant.build(path, file, target)
                .fail(function (err) {
                    console.error("[brackets-ant] failed to run ant.build", err);
                })
                .done(function (result) {
                    console.log("[brackets-ant] (%s)", result);
                });
        }).fail(function (err) {
            console.log(err);
        });
    }
    
    function _showAntPanel() {
        FileIndexManager.getFileInfoList("all")
            .done(function (fileListResult) {
                console.log(fileListResult);
            });
    }
    
    function _removeAllContextMenuItems() {
        $.each(menuItems, function (index, target) {
            contextMenu.removeMenuItem(target);
        });
    }
        
    $(contextMenu).on("beforeContextMenuOpen", function (evt) {
        
        var selectedEntry = ProjectManager.getSelectedItem();
        
        _removeAllContextMenuItems();
        
        if (_isXML(selectedEntry)) {
            _isAntBuild(selectedEntry).done(function (targets) {
                $.each(targets, function (index, target) {
                    
                    if (!CommandManager.get(RUN_BUILD + target)) {
                        CommandManager.register("Build " + target + "...", RUN_BUILD + target, function () {
                            _runBuild(target);
                        });
                    }
                    
                    contextMenu.addMenuItem(RUN_BUILD + target, "", Menus.LAST);
                    menuItems.push(RUN_BUILD + target);
                });
            });
        }
    });
    
    contextMenu.addMenuItem(Menus.DIVIDER, "", Menus.LAST);
});