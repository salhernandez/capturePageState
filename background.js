// Chrome automatically creates a background.html page for this to execute.
// This can access the inspected page via executeScript
// 
// Can use:
// chrome.tabs.*
// chrome.extension.*

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
            alert("passing stuff to devtools", JSON.stringify(message))

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
    }
    return true;
});
