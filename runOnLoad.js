// Inject the payload.js script into the current tab after the popout has loaded
// window.addEventListener('load', function (evt) {
// 	chrome.extension.getBackgroundPage().chrome.tabs.executeScript(null, {
// 		file: 'payload.js'
// 	});
// });

//
// // Listen to messages from the payload.js script and write to popout.html
// chrome.runtime.onMessage.addListener(function (message) {
// 	document.getElementById('pagetitle').innerHTML = message;
// });

//when the extension opens
window.addEventListener('load', function (evt) {
    // on load
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete' && tab.active) {

        chrome.extension.getBackgroundPage().chrome.tabs.executeScript(null, {
            file: 'payload.js'
        });
    }
})