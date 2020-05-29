const php8folder = 'php-8-bin';
const php8extensionfolder = `/var/task/${php8folder}/lib/php/extensions/no-debug-non-zts-20190128`;
const php5folder = 'php-5-bin';

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
process.env['LD_LIBRARY_PATH'] = `/var/task/${php8folder}/lib:` + process.env['LD_LIBRARY_PATH'];
const spawn = require('child_process').spawn;
const fs = require('fs').promises;

exports.handler = async function(event) {
	
	process.env['PHPRC'] = `/var/task/${php8folder}/lib/php.ini`;

	const php_prefix = "<?php $start = microtime(true); ob_start(); ?><?php ";
	const php_postfix = " ?><?php ob_flush(); echo 'boundary;php;response;time;elapsed;'; echo microtime(true) - $start; ?>";
	
	
	const promise = new Promise(async function(resolve, reject) {

		try {
			await fs.writeFile("/tmp/index.php", php_prefix + event.php_source + php_postfix);
			console.log("OK");
		} catch(e) {
			console.log(e);
			reject('error writing to file');  
		}
		
		var output = {};

		output['php8_without_jit'] = {};
		output['php8_without_jit']['data'] = "";
		output['php8_without_jit']['success'] = false;
		
		output['php8_with_jit'] = {};
		output['php8_with_jit']['data'] = "";
		output['php8_with_jit']['success'] = false;

		output['php5'] = {};
		output['php5']['data'] = "";
		output['php5']['success'] = false;
		
		// PHP 8 (without JIT)
		//////////////////////

		const child_php8_jit = spawn(`${php8folder}/bin/php`,["-d", `extension_dir=${php8extensionfolder}`,"-d", "opcache.enable_cli=0", "/tmp/index.php"]);
		
		try {			
			for await (const data of child_php8_jit.stdout) {
				output['php8_without_jit']['data']+=data;
				output['php8_without_jit']['success'] = true;
			};
			
			if(output['php8_without_jit']['success'] == false) {
				for await (const data of child_php8_jit.stderr) {
					output['php8_without_jit']['data']+=data;
					output['php8_without_jit']['success'] = false;
				};
			}
		} catch(e) {
			console.log(e);
			output['php8_without_jit']['data'] = e;
			output['php8_without_jit']['success'] = false;   
		}


		// PHP 8 (with JIT)
		//////////////////////

		const child_php8 = spawn(`${php8folder}/bin/php`,["-d", `extension_dir=${php8extensionfolder}`, "/tmp/index.php"]);
	
		try {			
			for await (const data of child_php8.stdout) {
				output['php8_with_jit']['data']+=data;
				output['php8_with_jit']['success'] = true;
			};
			
			if(output['php8_with_jit']['success'] == false) {
				for await (const data of child_php8.stderr) {
					output['php8_with_jit']['data']+=data;
					output['php8_with_jit']['success'] = false;
				};
			}
		} catch(e) {
			console.log(e);
			output['php8_with_jit']['data'] = e;
			output['php8_with_jit']['success'] = false;   
		}


		process.env['PHPRC'] = "";
		// PHP 5 (with JIT)
		//////////////////////

		const child_php5 = spawn(`${php5folder}/bin/php`,["/tmp/index.php"]);
	
		try {			
			for await (const data of child_php5.stdout) {
				output['php5']['data']+=data;
				output['php5']['success'] = true;
			};
			
			if(output['php5']['success'] == false) {
				for await (const data of child_php5.stderr) {
					output['php5']['data']+=data;
					output['php5']['success'] = false;
				};
			}
		} catch(e) {
			console.log(e);
			output['php5']['data'] = e;
			output['php5']['success'] = false;   
		}

		resolve(output);
	});
	return promise;
}