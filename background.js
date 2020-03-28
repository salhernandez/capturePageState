// Chrome automatically creates a background.html page for this to execute.
// This can access the inspected page via executeScript
// 
// Can use:
// chrome.tabs.*
// chrome.extension.*

var version = "1.0";

var gTabId;
var logData = [];

function onEvent(debuggeeId, message, params) {
    console.log('onEvent', onEvent);
    if (gTabId != debuggeeId.tabId)
        return;

    logData.push(params)
}

function onAttach(tabId, sendResponse) {
    console.log('onAttach - sendResponse', sendResponse);
    gTabId = tabId;
    if (chrome.runtime.lastError) {
      return;
    }

    // use Log.enable
    chrome.debugger.sendCommand({ tabId: tabId }, "Log.enable");
    chrome.debugger.onEvent.addListener(onEvent);
    console.log('before setTimeout', logData);

    return setTimeout(() => {
        sendResponse(logData);
        chrome.debugger.sendCommand({ tabId: tabId }, "Log.disable");
        setTimeout(() => {chrome.debugger.detach({ tabId: tabId });}, 500);
    }, 1000);
  }


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "getConsoleLog") {
            chrome.debugger.attach({tabId:request.tabId}, version, onAttach.bind(null, request.tabId, sendResponse));
        }
        return true;
    }
);
