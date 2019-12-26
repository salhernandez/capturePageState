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

        if (message.action === "downloadHARlog") {
            port.postMessage(message);
        } else {
            sendResponse(message);
        }
    }

    // Listens to messages sent from the panel
    chrome.extension.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function(port) {
        chrome.extension.onMessage.removeListener(extensionListener);
    });
});

var gTabId;
var logData = [];

function onEvent(debuggeeId, message, params) {
    if (gTabId != debuggeeId.tabId)
        return;

    logData.push(params)
}

function onAttach(tabId) {
    gTabId = tabId;
    if (chrome.runtime.lastError) {
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

    if(request.action === "getDevToolsStatus"){
        // response needs to be in JSON format
        sendResponse({data: isDevToolsOpen})
    } else if (request.action === "getConsoleLog"){

        chrome.debugger.attach({tabId:request.tabId}, version,
            onAttach.bind(null, request.tabId));
    }
    return true;
});
