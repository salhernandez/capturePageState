// This creates and maintains the communication channel between
// the inspectedPage and the dev tools panel.
//
// In this example, messages are JSON objects
// {
//   action: ['code'|'script'|'message'], // What action to perform on the inspected page
//   content: [String|Path to script|Object], // data to be passed through
//   tabId: [Automatically added]
// }

(function createChannel() {
    //Create a port with background page for continous message communication
    var port = chrome.extension.connect({
        name: "Sample Communication" //Given a Name
    });

    // Listen to messages from the background page
    port.onMessage.addListener(function (message) {
      document.querySelector('#insertmessagebutton').innerHTML = message.content;


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
    
      // port.postMessage(message);
    });

}());

// This sends an object to the background page 
// where it can be relayed to the inspected page
function sendObjectToInspectedPage(message) {
    message.tabId = chrome.devtools.inspectedWindow.tabId;
    chrome.extension.sendMessage(message);
}