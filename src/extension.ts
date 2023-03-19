// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const http = require('http');
import { PHP, PHPServer, loadPHPRuntime, getPHPLoaderModule } from './built-php-wasm-node';

class PortFinder {
	private static port: number = 5401;

	public static incrementPort() {
		return this.port++;
	}

	public static isPortFree() {
		return new Promise( resolve => {
			const server = http.createServer();

			server.listen( this.port, () => {
				server.close();
				resolve( true );
			} )
			.on('error', () => {
				resolve( false );
			} );
		} );
	}

	public static async getOpenPort() {
		while ( ! await this.isPortFree() ) {
			this.incrementPort();
		}

		return this.port;
	}
}

async function loadPhpServer( context: vscode.ExtensionContext, openPort: number ) {
	const phpLoaderModule = await getPHPLoaderModule('8.0');
	const loaderId = await loadPHPRuntime(phpLoaderModule);
	const php = new PHP(loaderId);
	php.mkdirTree('/wordpress');
	php.mount({root: context.extensionPath + '/dist/wordpress'} as any, '/wordpress');
	// TODO Instead of mounting WordPress to documentRoot,
	// we need to load all WordPress files into the virtual filesystem,
	// and then mount the project directory as a plugin into the filesystem.
	const phpServer = new PHPServer(php, {
		documentRoot: '/wordpress',
		absoluteUrl: `http://localhost:${openPort}/scope:5/`,
		isStaticFilePath: (path: string) => {
			return php.fileExists(context.extensionPath + path);
		}
	});

	return phpServer;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('wordpress-playground.iframePlayground', async () => {
		const openPort = await PortFinder.getOpenPort();

		let phpServer = await loadPhpServer( context, openPort );

		const server = http.createServer( async (req, res) => {
			const resp = await phpServer.request({relativeUrl: req.url});
			res.statusCode = resp.httpStatusCode;
			Object.keys(resp.headers).forEach((key) => {
				res.setHeader(key, resp.headers[key]);
			});
			res.end(resp.body);
		});

		server.listen( openPort, () => {
			console.log( `Server running at http://localhost:${openPort}/` );
		} );

		// Create a new webview panel
		const panel = vscode.window.createWebviewPanel(
			'playgroundviewer',
			'Playground',
			vscode.ViewColumn.One,
			{
			  enableScripts: true,
			}
		  );

		// Set the content of the webview panel to an iframe that loads a website URL
		panel.webview.html = `
		  <!DOCTYPE html>
		  <html>
			<head>
			  <meta charset="UTF-8">
			  <meta name="viewport" content="width=device-width, initial-scale=1.0">
			  <title>Playground</title>
			  <style type="text/css">
		  		html, body, iframe {
					height: 100%;
					width: 100%;
					margin: 0;
					padding: 0;
				}
				iframe {
					border: none;
				}
			  </style>
			</head>
			<body>
			  <iframe src="http://localhost:${openPort}/scope:5/index.php"></iframe>
			</body>
		  </html>
		`;

		panel.onDidDispose( () => {
			server.close();
		} );
	  } );

	  context.subscriptions.push( disposable );
}

// This method is called when your extension is deactivated
export function deactivate() {}
