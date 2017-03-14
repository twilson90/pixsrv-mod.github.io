console.log("ooh ello");

$(function(){
	var heditors = [];

	var filters = [];
	var filtersDict = {};
	var perspectiveNubs = [175, 156, 496, 55, 161, 279, 504, 330];

	function Filter(name, id, init, update) {
		this.id = id;
		this.name = name;
		this.update = update;
		this.sliders = [];
		this.nubs = [];
		init.call(this);

		filters.push(this);
		filtersDict[id] = this;
	}

	Filter.prototype.addNub = function(name, x, y) {
		this.nubs.push({ name: name, x: x, y: y });
	};

	Filter.prototype.addSlider = function(name, label, min, max, value, step) {
		this.sliders.push({ name: name, label: label, min: min, max: max, value: value, step: step });
	};

	function HEditor(editor, name){
		this.editor = editor;
		this.name = name;
		this.canvas = editor.view.ctx.canvas;
		this.$canvas = $(this.canvas);
		this.loading = Promise.resolve();
		this.$container = this.$canvas.parent();
		this.$container.addClass("heditor");

		var $html = $('\
	<div class="extras">\
		<div class="preview">\
			<div class="placeholder"  style="width:160px; height:160px"></div>\
		</div>\
		<div>\
			<div style="display:inline-block;">\
				<input class="input" type="file" name="pic" accept="image/*">\
				<button class="reset" type="button">Reset</button>\
				<button class="apply" type="button">Apply Image + Filters</button>\
				<button class="applySrc" type="button">Apply Filters To Source</button>\
			</div>\
			\
			<div class="fx_properties">\
				<div>Filter:</div>\
				<div><select class="filters"></select></div>\
				<div class="filterSettings"></div>\
			</div>\
		</div>\
	</div>\
	');

		this.$preview = $html.find(".preview");
		this.$input = $html.find(".input");
		this.$applyButton = $html.find(".apply");
		this.$applySrcButton = $html.find(".applySrc");
		this.$resetButton = $html.find(".reset");
		this.$filters = $html.find(".filters");
		this.$filterSettings = $html.find(".filterSettings");

		this.$container.after($html);

		this.$nubsContainer = $("<div class='nubs'></div>");
		this.$preview.append(this.$nubsContainer);

		try {
			this.fxCanvas = fx.canvas();
		} catch (e) {
			alert(e);
			return;
		}
		var $placeholder = $html.find(".placeholder");
		var style = $placeholder.attr('style');
		$html.find(".placeholder").replaceWith(this.fxCanvas);
		$(this.fxCanvas).attr("style", style);

		this.$input.change(() => {
			var file = this.$input[0].files[0];
		if (!file)
			return;

		var reader = new FileReader();
		reader.onload = (e) => {
			this.loadImage(e.target.result);
		};
		reader.readAsDataURL(file);
	});

		this.$applyButton.click(() => {
			this.applyImage();
	})

		this.$applySrcButton.click(() => {
			this.applyToSource();
	})

		this.$resetButton.click(() => {
			this.reset();
	})

		// Create the filter selector
		var html = '';
		for (var k in filters) {
			var filter = filters[k];
			html += '<option value="'+filter.id+'">' + filter.name + '</option>';
		}
		this.$filters.html(html);
		this.$filters.change(() => {
			this.setFilter(this.$filters.val());
	});

		this.filter = filters[0];
		//this.loadImage(img64);
		//this.setImage()
		this.setFilter("brightnessContrast");

		heditors.push(this);
	}

	HEditor.prototype.setFilter = function(filterId) {
		this.loading.then(() => {
			if (this.$filters.val() != filterId) {
			this.$filters.val(filterId);
		}

		var filter = filtersDict[filterId];
		this.filter = filter;
		this.filterSettings = {};
		this.$filterSettings.empty();

		// Add a row for each slider
		filter.sliders.forEach((slider, i) => {
			var $sliderBlock = $('<div class="sliderBlock"><div>' + slider.label + ':</div><div class="slider"></div></div>');
		this.$filterSettings.append($sliderBlock);
		var $slider = $sliderBlock.find(".slider");
		var onchange = (event, ui) => {
			this.filterSettings[slider.name] = ui.value;
			this.updateFilter();
		};
		$slider.slider({
			slide: onchange,
			change: onchange,
			min: slider.min,
			max: slider.max,
			value: slider.value,
			step: slider.step
		});
		this.filterSettings[slider.name] = slider.value;
	});

		this.$nubsContainer.empty();

		filter.nubs.forEach((nub, i) => {
			var x = nub.x * this.$nubsContainer.width();
		var y = nub.y * this.$nubsContainer.height();
		var nub_pt = this.filterSettings[nub.name] = {x:x / this.canvasScale.x, y:y / this.canvasScale.y};
		var $nub = $('<div class="nub"></div>');
		this.$nubsContainer.append($nub);
		$nub.draggable({
				drag: (e, ui) => {
				//mouse_down = false;
				var offset = $(e.target.parentNode).offset();
		nub_pt.x = (ui.offset.left - offset.left) / this.canvasScale.x;
		nub_pt.y = (ui.offset.top - offset.top) / this.canvasScale.y;
		this.updateFilter();
	},
		containment: 'parent',
			scroll: false
	}).css({ left: x, top: y });

	});

		this.updateFilter();
	});
	}

	HEditor.prototype.loadImage = function(src) {
		this.loading = new Promise((resolve, reject) => {
				var $img = $('<img>', {src: src, crossOrigin: "anonymous"});
		$img.load(() => {
			this.setImage($img[0]);
		resolve();
	});
	});
	}

	HEditor.prototype.updateFilter = function() {
		this.canvasScale = { x: $(this.fxCanvas).width() / this.fxCanvas.width, y: $(this.fxCanvas).height() / this.fxCanvas.height };
		this.filter.update.call(this.filterSettings, this.fxCanvas, this.texture);
	}

	HEditor.prototype.setImage = function(image){
		this.image = image;
		this.texture = this.fxCanvas.texture(image);
		this.updateFilter();
	}

	HEditor.prototype.applyImage = function(){
		this.fxCanvas.update();
		this.editor.buffer.drawImage(this.fxCanvas,
			0, 0, this.fxCanvas.width, this.fxCanvas.height,
			0, 0, 256, 256
		);
	}

	HEditor.prototype.applyToSource = function(){
		this.texture = this.fxCanvas.texture(this.fxCanvas);
		this.fxCanvas.update();
		this.setFilter("brightnessContrast");
	}

	HEditor.prototype.reset = function(){
		this.texture = this.fxCanvas.texture(this.image);
		this.fxCanvas.update();
		this.setFilter("brightnessContrast");
	}

	//-------------------------------------------------

	new Filter('Brightness / Contrast', 'brightnessContrast', function() {
		this.addSlider('brightness', 'Brightness', -1, 1, 0, 0.01);
		this.addSlider('contrast', 'Contrast', -1, 1, 0, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).brightnessContrast(this.brightness,this.contrast).update();
	});
	new Filter('Hue / Saturation', 'hueSaturation', function() {
		this.addSlider('hue', 'Hue', -1, 1, 0, 0.01);
		this.addSlider('saturation', 'Saturation', -1, 1, 0, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).hueSaturation(this.hue, this.saturation).update();
	});
	new Filter('Vibrance', 'vibrance', function() {
		this.addSlider('amount', 'Amount', -1, 1, 0.5, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).vibrance(this.amount).update();
	});
	new Filter('Denoise', 'denoise', function() {
		this.addSlider('exponent', 'Exponent', 0, 50, 20, 1);
	}, function(canvas, texture) {
		canvas.draw(texture).denoise(this.exponent).update();
	});
	new Filter('Unsharp Mask', 'unsharpMask', function() {
		this.addSlider('radius', 'Radius', 0, 200, 20, 1);
		this.addSlider('strength', 'Strength', 0, 5, 2, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).unsharpMask(this.radius, this.strength).update();
	});
	new Filter('Noise', 'noise', function() {
		this.addSlider('amount', 'Amount', 0, 1, 0.5, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).noise(this.amount).update();
	});
	new Filter('Sepia', 'sepia', function() {
		this.addSlider('amount', 'Amount', 0, 1, 1, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).sepia(this.amount).update();
	});
	new Filter('Vignette', 'vignette', function() {
		this.addSlider('size', 'Size', 0, 1, 0.5, 0.01);
		this.addSlider('amount', 'Amount', 0, 1, 0.5, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).vignette(this.size, this.amount).update();
	});

	new Filter('Zoom Blur', 'zoomBlur', function() {
		this.addNub('center', 0.5, 0.5);
		this.addSlider('strength', 'Strength', 0, 1, 0.3, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).zoomBlur(this.center.x, this.center.y, this.strength).update();
	});
	new Filter('Triangle Blur', 'triangleBlur', function() {
		this.addSlider('radius', 'Radius', 0, 200, 50, 1);
	}, function(canvas, texture) {
		canvas.draw(texture).triangleBlur(this.radius).update();
	});
	new Filter('Tilt Shift', 'tiltShift', function() {
		this.addNub('start', 0.15, 0.75);
		this.addNub('end', 0.75, 0.6);
		this.addSlider('blurRadius', 'Blur Radius', 0, 50, 15, 1);
		this.addSlider('gradientRadius', 'Gradient Radius', 0, 400, 200, 1);
	}, function(canvas, texture) {
		canvas.draw(texture).tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update();
	});
	new Filter('Lens Blur', 'lensBlur', function() {
		this.addSlider('radius', 'Radius', 0, 50, 10, 1);
		this.addSlider('brightness', 'Brightness', -1, 1, 0.75, 0.01);
		this.addSlider('angle', 'Angle', -Math.PI, Math.PI, 0, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).lensBlur(this.radius, this.brightness, this.angle).update();
	});

	new Filter('Swirl', 'swirl', function() {
		this.addNub('center', 0.5, 0.5);
		this.addSlider('angle', 'Angle', -25, 25, 3, 0.1);
		this.addSlider('radius', 'Radius', 0, 600, 200, 1);
	}, function(canvas, texture) {
		canvas.draw(texture).swirl(this.center.x, this.center.y, this.radius, this.angle).update();
	});
	new Filter('Bulge / Pinch', 'bulgePinch', function() {
		this.addNub('center', 0.5, 0.5);
		this.addSlider('strength', 'Strength', -1, 1, 0.5, 0.01);
		this.addSlider('radius', 'Radius', 0, 600, 200, 1);
	}, function(canvas, texture) {
		canvas.draw(texture).bulgePinch(this.center.x, this.center.y, this.radius, this.strength).update();
	});
	/*new Filter('Perspective', 'perspective', function() {
	 var w = 640, h = 425;
	 this.addNub('a', perspectiveNubs[0] / w, perspectiveNubs[1] / h);
	 this.addNub('b', perspectiveNubs[2] / w, perspectiveNubs[3] / h);
	 this.addNub('c', perspectiveNubs[4] / w, perspectiveNubs[5] / h);
	 this.addNub('d', perspectiveNubs[6] / w, perspectiveNubs[7] / h);
	 }, function(canvas, texture) {
	 var before = perspectiveNubs;
	 var after = [this.a.x, this.a.y, this.b.x, this.b.y, this.c.x, this.c.y, this.d.x, this.d.y];
	 canvas.draw(texture).perspective([before], [after]).update();
	 });*/

	new Filter('Ink', 'ink', function() {
		this.addSlider('strength', 'Strength', 0, 1, 0.25, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).ink(this.strength).update();
	});
	new Filter('Edge Work', 'edgeWork', function() {
		this.addSlider('radius', 'Radius', 0, 200, 10, 1);
	}, function(canvas, texture) {
		canvas.draw(texture).edgeWork(this.radius).update();
	});
	new Filter('Hexagonal Pixelate', 'hexagonalPixelate', function() {
		this.addNub('center', 0.5, 0.5);
		this.addSlider('scale', 'Scale', 10, 100, 20, 1);
	}, function(canvas, texture) {
		canvas.draw(texture).hexagonalPixelate(this.center.x, this.center.y, this.scale).update();
	});
	new Filter('Dot Screen', 'dotScreen', function() {
		this.addNub('center', 0.5, 0.5);
		this.addSlider('angle', 'Angle', 0, Math.PI / 2, 1.1, 0.01);
		this.addSlider('size', 'Size', 3, 20, 3, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).dotScreen(this.center.x, this.center.y, this.angle, this.size).update();
	});
	new Filter('Color Halftone', 'colorHalftone', function() {
		this.addNub('center', 0.5, 0.5);
		this.addSlider('angle', 'Angle', 0, Math.PI / 2, 0.25, 0.01);
		this.addSlider('size', 'Size', 3, 20, 4, 0.01);
	}, function(canvas, texture) {
		canvas.draw(texture).colorHalftone(this.center.x, this.center.y, this.angle, this.size).update();
	});

	//hog-mod 1.0.0
	var $title = $("body>div>div>a").first();
	$title.html("Image-to-Image Demo<br>(hog-mod-1.0.0)");
	$author = $title.parent().next().next();
	$author.html($author.html()+'<br><span style="font-style:italic;text-align:center;">Improved by </span><span style="font-style:italic;text-align:center;"><a href="http://www.cookdandbombd.co.uk/forums/index.php?action=profile;u=9816">hedgehog90</a></span> — <span style="font-family:Georgia, serif;font-style:italic;"><span>March 7<sup style="font-size:10px;margin-left:1px;margin-right:-6px;">th</sup>, 2017</span></span>');
	$author.css({"line-height":"30px"});

	var heditors = [];
	for (var k in editors) {
		new HEditor(editors[k], k);
	}

});