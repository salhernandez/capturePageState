// Copyright (c) 2012,2013 Peter Coles - http://mrcoles.com/ - All rights reserved.
// Copyright (c) 2015 Jean-Martin Archer
// Use of this source code is governed by the MIT License found in LICENSE

var bucketName = "fyle-hackathon";
var bucketRegion = "ap-south-1";
var IdentityPoolId = "ap-south-1:cedc3d2e-5667-42df-a43b-c9569f6bc687";
var finalSignedURL = '';

// for upload json to s3 and download from signed url 
AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});

var s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: bucketName }
});

function upload_to_s3 (evidence) {

  var json_str = JSON.stringify(evidence);
  var blob = new Blob([json_str], {
    type: "application/json"
  });
  var fileName = 'evidence' + (new Date()).getTime() + '.json';

  var evidenceLocker = encodeURIComponent('evidence_locker') + '/';

  var evidenceFileKey = evidenceLocker + fileName;

  // Use S3 ManagedUpload class as it supports multipart uploads
  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: bucketName,
      Key: evidenceFileKey,
      Body: blob,
    }
  });

  var promise = upload.promise();

  return promise.then(
    function(data) {
          var params = {
            Bucket: bucketName,
            Key: evidenceFileKey,
            Expires: 86400
          };
          var url = s3.getSignedUrl('getObject', params);
          console.log('The URL is', url);
          return url;
        },
        function(err) {
          return alert("There was an error uploading your evidence. <br/> please try after sometime", err.message);
        }
    );
}

function download_from_s3 (signed_url) {
  fetch(signed_url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    })
    .then(function(response) {
      return response.blob();
    })
    .then(function(blob) {
      b = new Blob([blob]);
      return b.text();
    })
    .then( function (b){
      console.log(b);
      return JSON.parse(b);
    })
    .catch(function(err) {
    console.log('error');
  });
}

// for screenshot
function captureScreen (sendResponse) {
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.setZoom(tab.id, 1.0);
        chrome.tabs.get(tab.id, function (tab) {
            chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 100 }, function (dataURI) {
                if (dataURI) {
                    sendResponse(dataURI);
                }
            });
        });
    });
};

function createEvidence (event) {
    let evidence = {
        url: '',
        local_storage: {},
        system_info: {},
        log_data: [],
        screenshot_encoded: ''
    }

    // url, local_storage and system_info
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        evidence.url = tabs[0].url;
        // listener in content.js
        chrome.tabs.sendMessage(tabs[0].id, {action: "getBrowserData"}, function(response) {
            evidence.local_storage = response.local_storage;
            evidence.system_info = response.browser_data;

            // listener in background.js
            chrome.extension.sendMessage({tabId:tabs[0].id, action: "getConsoleLog"}, function (response) {
                console.log('getConsoleLog response', response);
                evidence.log_data = response;

                captureScreen(function (response) {
                    console.log('captureScreen response', response);
                    evidence.screenshot_encoded = response;

                    upload_to_s3(evidence).then(function (signed_url) {
                        finalSignedURL = signed_url;
                        return download_from_s3(signed_url);
                    });
                });
            });
        });
    });
}

// function downloadAndLoadEvidence (event) {
// 	evidence = download_from_s3(finalSignedURL);
// }
	

(function () {
    var createEvidenceAction = document.getElementById('createEvidenceAction');
    createEvidenceAction.addEventListener('click', createEvidence);

    var loadEvidenceAction = document.getElementById('loadEvidenceAction');

	loadEvidenceAction.onclick = function (event) {
		var file = document.getElementById("file").files[0];
		var reader = new FileReader();
		reader.onload = function(e){
			console.log(JSON.parse(e.target.result));
			evidence = e.target.result;
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {action: 'LoadData', evidence: evidence}, function(response) {
					console.log(response);
				});
			});
		}
		evidence = reader.readAsText(file);
	}
})();
