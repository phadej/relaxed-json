/* global $, CodeMirror, RJSON, -console */
$(function () {
	"use strict";

	var fromTextareaEl = $("#area-from textarea");
	var toTextareaEl = $("#area-to textarea");
	var prettifyEl = $("#prettify-checkbox:checkbox");
	var relaxedEl = $("#relaxed-checkbox:checkbox");
	var tolerantEl = $("#tolerant-checkbox:checkbox");
	var errorsEl = $("#errors");

	var errorLineH;

	var cmFrom = CodeMirror.fromTextArea(fromTextareaEl[0], {
		mode: "javascript",
	});

	var cmTo = CodeMirror.fromTextArea(toTextareaEl[0], {
		mode: "javascript",
	});

	var fromCmEl = $("#area-from .CodeMirror");

	function clearErrorLine() {
		if (errorLineH) {
			cmFrom.removeLineClass(errorLineH, "background", "error-line");
		}
	}

	function transform() {
		var t;
		var v;
		try {
			errorsEl.html("");
			var i = cmFrom.getValue();
			t = RJSON.transform(i);
			v = RJSON.parse(i, {
				relaxed: relaxedEl.is(":checked"),
				tolerant: tolerantEl.is(":checked"),
				warnings: true,
			});
			fromCmEl.removeClass("error");
			clearErrorLine();
		} catch (e) {
			fromCmEl.addClass("error");
			if (e && e.line) {
				clearErrorLine();
				errorLineH = cmFrom.getLineHandle(e.line - 1);
				if (errorLineH) {
					cmFrom.addLineClass(errorLineH, "background", "error-line");
				}
			}
			errorsEl.html(e.toString());

			// when tolerant, we still get something
			if (e.obj) {
				v = e.obj;
				t = JSON.stringify(v, null, 2);
			} else {
				return;
			}
		}

		if (prettifyEl.is(":checked")) {
			cmTo.setValue(v !== undefined ? JSON.stringify(v, null, 2) : t);
		} else {
			cmTo.setValue(t);
		}
	}

	// initial
	transform();

	// onclick
	prettifyEl.on("change", transform);
	relaxedEl.on("change", transform);
	tolerantEl.on("tolerant", transform);
	cmFrom.on("change", transform);
});
