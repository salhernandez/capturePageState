// Copyright (c) 2012,2013 Peter Coles - http://mrcoles.com/ - All rights reserved.
// Copyright (c) 2015 Jean-Martin Archer
// Use of this source code is governed by the MIT License found in LICENSE

function $(id) { return document.getElementById(id); }
function show(id) { $(id).style.display = 'block'; }

function capturePage(data) {
	function createHiDPICanvas(w, h, ratio) {
		var canvas = document.createElement("canvas");
		canvas.width = w * ratio;
		canvas.height = h * ratio;
		canvas.style.width = w + "px";
		canvas.style.height = h + "px";
		canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
		return canvas;
	}

	var margins = data.margins;
	var canvas = createHiDPICanvas(data.totalWidth + margins.left + margins.right, data.totalHeight + margins.top + margins.bottom + data.titleBar.height, data.pixelRatio);
	var ctx = canvas.getContext('2d');

	chrome.tabs.captureVisibleTab(
		null, {format: 'png', quality: 100}, function(dataURI) {
			if (dataURI) {
				var image = new Image();
				var titleBarImage = new Image();
				titleBarImage.onload = function () {
					addTitleBar(ctx, titleBarImage, data);
				};
				titleBarImage.src = data.titleBar.data;
				image.onload = function() {
					var coords = {
						x: margins.left,
						y: margins.top + data.titleBar.height,
						w: data.totalWidth,
						h: data.totalHeight
					};
					ctx.drawImage(image, coords.x, coords.y, coords.w, coords.h);
					openPage(canvas, data);
				};
				image.src = dataURI;
			}
		});

	function addTitleBar(ctx, titleBarImage, data) {
		var totalBarWidth = data.totalWidth + 12;
		var leftWidth = data.titleBar.leftWidth;
		var offset = data.titleBar.offset;

		var middleBar = {
			sx: offset, sy: 0,
			sw: 5, sh: leftWidth,
			dx: data.margins.left + 5, dy: data.margins.top,
			dw: totalBarWidth - 20, dh: leftWidth
		};
		var leftBar = {
			sx: 0, sy: 0,
			sw: offset, sh: leftWidth,
			dx: data.margins.left, dy: data.margins.top,
			dw: offset, dh: leftWidth
		};
		var rigthBar = {
			sx: offset, sy: 0,
			sw: offset, sh: leftWidth,
			dx: totalBarWidth, dy: data.margins.top,
			dw: offset, dh: leftWidth
		};

		addShadow(ctx, data);
		drawBar(ctx, titleBarImage, middleBar);
		drawBar(ctx, titleBarImage, leftBar);
		drawBar(ctx, titleBarImage, rigthBar);
	}

	function drawBar(ctx, image, coords) {
		ctx.drawImage(image, coords.sx, coords.sy, coords.sw, coords.sh, coords.dx, coords.dy, coords.dw, coords.dh);
	}

	function addShadow(ctx, data) {
		ctx.save();
		var rect = {
			x: data.margins.left + data.shadow.edgeOffset,
			y: data.margins.top + data.shadow.edgeOffset,
			w: data.totalWidth - (data.shadow.edgeOffset * 2),
			h: data.totalHeight + data.titleBar.height - data.shadow.edgeOffset
		};
		ctx.rect(rect.x, rect.y, rect.w, rect.h);
		ctx.shadowColor = data.shadow.color;
		ctx.shadowBlur = data.shadow.blur;
		ctx.shadowOffsetX = data.shadow.offsetX;
		ctx.shadowOffsetY = data.shadow.offsetY;
		ctx.fill();
		ctx.restore();
	}
}

function openPage(canvas, data) {
	// standard dataURI can be too big, let's blob instead
	// http://code.google.com/p/chromium/issues/detail?id=69227#c27

	var dataURI = canvas.toDataURL();
	var byteString = atob(dataURI.split(',')[1]);
	var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

	var ab = new ArrayBuffer(byteString.length);
	var ia = new Uint8Array(ab);
	for (var i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}

	var blob = new Blob([ab], {type: mimeString});
	var size = blob.size + (1024/2);
	var name = data.url.split('?')[0].split('#')[0];
	if (name) {
		name = name
			.replace(/^https?:\/\//, '')
			.replace(/[^A-z0-9]+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^[_\-]+/, '')
			.replace(/[_\-]+$/, '');
		name = '-' + name;
	} else {
		name = '';
	}
	name = 'screenshot' + name + '-' + Date.now() + '.png';

	function onwriteend() {
		// open the file that now contains the blob
		window.open('filesystem:chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/temporary/' + name);
		chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {width: data.originalWidth});
	}

	function errorHandler() {
		show('uh-oh');
	}

	// create a blob for writing to a file
	window.webkitRequestFileSystem(window.TEMPORARY, size, function(fs){
		fs.root.getFile(name, {create: true}, function(fileEntry) {
			fileEntry.createWriter(function(fileWriter) {
				fileWriter.onwriteend = onwriteend;
				fileWriter.write(blob);
			}, errorHandler);
		}, errorHandler);
	}, errorHandler);
}

(function () {
	chrome.tabs.getSelected(null, function(tab) {
		// TODO-JMA enabled setZoom when Google Chrome 42 is released.
		// chrome.tabs.setZoom(tab.id, 1.0);
		var loaded = false;
		var PIXEL_RATIO = (function () {
			var ctx = document.createElement("canvas").getContext("2d"),
				dpr = window.devicePixelRatio || 1,
				bsr = ctx.webkitBackingStorePixelRatio ||
					ctx.backingStorePixelRatio || 1;

			return dpr / bsr;
		})();

		var data = {
			url: tab.url,
			targetWidth: 1280,
			totalWidth: null,
			totalHeight: null,
			pixelRatio: PIXEL_RATIO,
			originalWidth: tab.width,
			margins: {
				top: 15,
				bottom: 25,
				left: 25,
				right: 25
			},
			titleBar: {
				height: 36,
				leftWidth: 60,
				offset: 70,
				data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFMAAAAkCAYAAAD1lQZ5AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAArdJREFUeNrsmM9uElEUxj9grmSgYJWoWFpS3ftnQZG4aKMm6kJ9Ak30ATSpuqvLutSFvoALn0BdqImadqFIXfhnb5sRaNWgLQpEB4L3DKPpgty54BC6OF9yNvd+czL55c7lOwQsy4Krs7JmZU3JGgHLSz9lLcm6LesRLQTdjXlZD2QdY5DaGnF5PXT5ISBP5hl3gfV/Okcn8ypz8EWzBDPDHHxRhmDGmIMvigWZgX9imAyTYTJMFsMciox+Hwy0WogsvYb54R3E5zVnzd6TROPAIdSnjqAdCun3ajcR3XgOs5qH+F3s9No2jkY8h9r242gHenvNpuz3pLaIxUYBll1y1tIihWkzi1PRaRgBYyAwaZxs9/pQqFrFzvv3INZWu+7byb34dv4iWvG4d6/mdyRKtyB+Wd17hdOopK6hZezQerdKax03K3exbH/qur9PTGAucRmJ0OjwP3M6kSqQJNojT6DZ9DyRKpBOL7lHHvLqnEgVSBLtzVfuwNboN3CY9GmrQG4GGnlTUHqiGy+UIDcDJa+X6NNWgfyrFbuIp9I7dJh0R/rlNauv9HtpeOmO1FUv3oHBFOWSvne17HHiVvR7aXg/2pZ2v+UevFsjGgV9bO/zL3AIoeHDtMdS+l4ZlZT74Un9XjIqeWm/SGv3o6g0dJiUI/3yUo7U7qXhpRypq168A4NZz2SdHKlzKsmrEgVyypGevcITjtdLJ2UgnxTeJ5g85B06zLZhOIFcBdQJ7RcuOV5lL3kPUiBXAe2E9utaU5CQnhuJK04wV4EkjxjAFNTXBPRvnCzkEXn/FsbXL53QvGs36gcPo57N9T5Orj+D+eOlHCfL7h05hkbsKGqjJ/oaJx/XFrDQyKNod0bdcZHEjJnD6ejM1honWfyvEcNkmAyTxTAZJsNkMUyGyTAZJss3/RFgAH76+ziLxwJqAAAAAElFTkSuQmCC'},
			shadow: {
				color: 'rgba(0, 0, 0, 0.5)',
				blur: 20 * PIXEL_RATIO,
				offsetX: 0,
				offsetY: 5 * PIXEL_RATIO,
				edgeOffset: 3 // shrinks the box generating the shadow so it doesn't show in the rounded the titleBar corners
			}
		};

		chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {width: data.targetWidth}, function() {
			chrome.tabs.get(tab.id, function(tab) {
				data.totalWidth = tab.width;
				data.totalHeight = tab.height;
				capturePage(data);
			});
		});
		// getting the tab again to get the new tab size.

		window.setTimeout(function() {
			if (!loaded) {
				show('uh-oh');
			}
		}, 1000);
	});
})();
