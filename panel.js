// This one acts in the context of the panel in the Dev Tools
//
// Can use
// chrome.devtools.*
// chrome.extension.*

document.querySelector('#getHAR').addEventListener('click', () => {
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
}, false);