window.onload = function() {

	var editor = ace.edit("editor");
	editor.setTheme("ace/theme/twilight");
	editor.session.setMode("ace/mode/php");
	editor.focus();
	editor.setFontSize(14);

	editor.setValue("<?php\n\n echo 'demo';");

	editor.session.getSelection().clearSelection();

	$('#editor').keydown(function (e) {
		if (e.ctrlKey && e.keyCode == 13) {
			$('#run').trigger('click');
		}
	});

	let wsRegexEnd = /\s*$/;
	let wsRegexStart = /^\s*/;
	let wsRegexEndPhpTag = /\?>$/;
	let wsRegexStartPhpTag = /^<\?php/;

	$('#run').on('click', function() {

		
		AWS.config.update({
			region: awsdata.aws_region,
			accessKeyId: awsdata.aws_access_key_id,
			secretAccessKey: awsdata.aws_secret_access_key,
		});
		var lambda = new AWS.Lambda({apiVersion: '2015-03-31'});

		
		$('#outputModal').modal('show');
		$('#outputModalBody').html('<div class="spinner-grow text-info" role="status"><span class="sr-only">Loading...</span></div>');
		var content = editor.getValue();
		content = content.replace(wsRegexEnd, '');
		content = content.replace(wsRegexStart, '');
		content = content.replace(wsRegexEndPhpTag, '');
		content = content.replace(wsRegexStartPhpTag, '');

		
		var params = { FunctionName: awsdata.aws_lambda_name, Payload: JSON.stringify({php_source: content }) };
		lambda.invoke(params, function(err, data) {
			if(err) {
				$('#outputModalBody').html("Something went wrong! Check out aws-data.js!");
				return;
			}      
			
			var data_response = JSON.parse(data.Payload);

			if(typeof data_response.php8_with_jit === 'undefined' || typeof data_response.php8_without_jit === 'undefined' || typeof data_response.php5 === 'undefined') {
				$('#outputModalBody').html(JSON.stringify(data_response));
				return;
			}

			
			var php8_with_jit = data_response.php8_with_jit.data.split("boundary;php;response;time;elapsed;");
			var php8_without_jit = data_response.php8_without_jit.data.split("boundary;php;response;time;elapsed;");
			var php5 = data_response.php5.data.split("boundary;php;response;time;elapsed;");

			var html = "<div class='responseContent'><div class='resonseHeader'>";
			html += "<span class='responseTitle'>PHP8 JIT:</span>";
			html += "<span class='responseExecution'>Execution time: " + parseFloat(php8_with_jit[1]) + " s</span>";
			html += "</div><div style='clear: both'>&nbsp</div>";
			html += "<div><pre id='php8_jit_response'></pre></div>";
			html += "</div>";

			html += "<div class='responseContent'><div class='resonseHeader'>";
			html += "<span class='responseTitle'>PHP8 without JIT:</span>";
			html += "<span class='responseExecution'>Execution time: " + parseFloat(php8_without_jit[1]) + " s</span>";
			html += "</div><div style='clear: both'>&nbsp</div>";
			html += "<div><pre id='php8_response'></pre></div>";
			html += "</div>";

			html += "<div class='responseContent'><div class='resonseHeader'>";
			html += "<span class='responseTitle'>PHP5:</span>";
			html += "<span class='responseExecution'>Execution time: " + parseFloat(php5[1]) + " s</span>";
			html += "</div><div style='clear: both'>&nbsp</div>";
			html += "<div><pre id='php5_response'></pre></div>";
			html += "</div>";

			$('#outputModalBody').html(html);


			var editor1 = ace.edit("php8_jit_response");
			editor1.setReadOnly(true);
			editor1.setTheme("ace/theme/twilight");
			editor1.session.setMode("ace/mode/html");

			var editor1_handler = function() {  heightUpdateFunction(editor1, "php8_jit_response");  editor1.renderer.off('afterRender', editor1_handler); }
			editor1.renderer.on('afterRender', editor1_handler);
			editor1.setValue(php8_with_jit[0]);

			
			var editor2 = ace.edit("php8_response");
			editor2.setReadOnly(true);
			editor2.setTheme("ace/theme/twilight");
			editor2.session.setMode("ace/mode/html");

			var editor2_handler = function() {  heightUpdateFunction(editor2, "php8_response");  editor2.renderer.off('afterRender', editor2_handler); }
			editor2.renderer.on('afterRender', editor2_handler);
			editor2.setValue(php8_without_jit[0]);


			var editor3 = ace.edit("php5_response");
			editor3.setReadOnly(true);
			editor3.setTheme("ace/theme/twilight");
			editor3.session.setMode("ace/mode/html");

			var editor3_handler = function() {  heightUpdateFunction(editor3, "php5_response");  editor3.renderer.off('afterRender', editor3_handler); }
			editor3.renderer.on('afterRender', editor3_handler);
			editor3.setValue(php5[0]);

			$('#php8_jit_execution').html(parseFloat(php8_with_jit[1]) + " s");
			$('#php8_execution').html(parseFloat(php8_without_jit[1]) + " s");
			$('#php5_execution').html(parseFloat(php5[1]) + " s");
		});
	});


	$('.nocss_example').on('click', function() {
		editor.setValue($('#' + $(this).data('type')).html());
	});
}

var heightUpdateFunction = function(editor, editorid) {
	var newHeight = editor.getSession().getScreenLength() * editor.renderer.lineHeight + editor.renderer.scrollBar.getWidth();
	$('#' + editorid).height(newHeight.toString() + "px");
	$('#' + editorid + '-section').height(newHeight.toString() + "px");
	editor.resize();
};