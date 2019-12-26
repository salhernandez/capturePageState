// Chrome automatically creates a background.html page for this to execute.
// This can access the inspected page via executeScript
// 
// Can use:
// chrome.tabs.*
// chrome.extension.*

var version = "1.0";

// When devtools opens, this gets connected
chrome.extension.onConnect.addListener(function (port) {
    var extensionListener = function (message, sender, sendResponse) {
        if(message.tabId && message.content) {
                //Evaluate script in inspectedPage
                if(message.action === 'code') {
                    chrome.tabs.executeScript(message.tabId, {code: message.content});

                //Attach script to inspectedPage
                } else if(message.action === 'script') {
                    chrome.tabs.executeScript(message.tabId, {file: message.content});
                    
                //Pass message to inspectedPage
                } else {
                    chrome.tabs.sendMessage(message.tabId, message, sendResponse);
                }

        // This accepts messages from the inspectedPage and 
        // sends them to the panel
        } else {
            if(message.action === "downloadHARlog"){
                port.postMessage(message);
            }
        }
        sendResponse(message);
    }


    

    // Listens to messages sent from the panel
    chrome.extension.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function(port) {
        chrome.extension.onMessage.removeListener(extensionListener);
    });

    // port.onMessage.addListener(function (message) {
    //     port.postMessage(message);
    // });

});

var gTabId;
var logData = [];

function onEvent(debuggeeId, message, params) {
    if (gTabId != debuggeeId.tabId)
        return;

    logData.push({debuggeeId: debuggeeId, params: params})
}

function onAttach(tabId) {
    gTabId = tabId;
    if (chrome.runtime.lastError) {
      alert(chrome.runtime.lastError.message);
      return;
    }

    // use Log.enable and go from there
    chrome.debugger.sendCommand({ tabId: tabId }, "Log.enable");
    chrome.debugger.onEvent.addListener(onEvent);

    setTimeout(() => {
        let harBLOB = new Blob([JSON.stringify(logData)]);

        let url = URL.createObjectURL(harBLOB);

        chrome.downloads.download({
            url: url
        });

        // cleanup after downloading file
        chrome.debugger.sendCommand({ tabId: tabId }, "Log.disable");
        chrome.debugger.detach({ tabId: tabId });
        gTabId = undefined;
        logData = [];

        
    }, 1000);
    
  }


// is devtools open
var openCount = 0;
var isDevToolsOpen = false;

// Always return true for async connections for chrome.runtime.onConnect.addListener
chrome.runtime.onConnect.addListener(function (port) {
    if (port.name == "devtools-page") {
      if (openCount == 0) {
        isDevToolsOpen = true
        // alert("DevTools window opening.");
      }
      openCount++;

      port.onDisconnect.addListener(function(port) {
          openCount--;
          if (openCount == 0) {
            isDevToolsOpen = false
            // alert("Last DevTools window closing.");
          }
      });
    }
    return true;
});

// messages from popup.js
// Always return true for async connections for chrome.runtime.onConnect.addListener
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    let info = {}
    info.request = JSON.stringify(request)
    info.sender = JSON.stringify(sender)
    info.sendResponse = JSON.stringify(sendResponse)

    // alert(isDevToolsOpen)

    if(request.action === "getDevToolsStatus"){
        // response needs to be in JSON format
        sendResponse({data: isDevToolsOpen})
    } else if (request.action === "getConsoleLog"){

        chrome.debugger.attach({tabId:request.tabId}, version,
            onAttach.bind(null, request.tabId));
    }
    return true;
});
