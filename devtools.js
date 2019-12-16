// Can use
// chrome.devtools.*
// chrome.extension.*

// Create a tab in the devtools area
// chrome.devtools.panels.create("Capture Page State", "icon48.png","panel.html", (panel) => {});


// most likely this will run when devtools opens
var backgroundPageConnection = chrome.runtime.connect({
    name: "devtools-page"
});



(function createChannel() {
    //Create a port with background page for continous message communication
    var port = chrome.extension.connect({
        name: "Another Communication" //Given a Name
    });

    console.log("we here yo")
    // Listen to messages from the background page
    port.onMessage.addListener(function (message) {
      chrome.devtools.network.getHAR(
        (harLog) => {
            let updatedHarLog = {};
            updatedHarLog.log = harLog;

            let harBLOB = new Blob([JSON.stringify(updatedHarLog)]);

            let url = URL.createObjectURL(harBLOB);

            chrome.downloads.download({
                url: url
            });
        }
    );
    });

}());