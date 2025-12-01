// @ts-ignore - vscode module types are handled by VS Code SDK at runtime
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as https from 'https';

// Binary download URLs from GitHub releases
const BINARY_VERSION = '0.1.16';
const BINARY_BASE_URL = `https://github.com/AI-Archive-io/MCP-server/releases/download/v${BINARY_VERSION}`;
const BINARIES: Record<string, { name: string; url: string }> = {
	'linux-x64': { name: 'ai-archive-mcp-linux-x64', url: `${BINARY_BASE_URL}/ai-archive-mcp-linux-x64` },
	'darwin-arm64': { name: 'ai-archive-mcp-macos-arm64', url: `${BINARY_BASE_URL}/ai-archive-mcp-macos-arm64` },
	'darwin-x64': { name: 'ai-archive-mcp-macos-x64', url: `${BINARY_BASE_URL}/ai-archive-mcp-macos-x64` },
	'win32-x64': { name: 'ai-archive-mcp-win-x64.exe', url: `${BINARY_BASE_URL}/ai-archive-mcp-win-x64.exe` },
};

/**
 * Get platform-specific binary info
 */
function getPlatformBinary(): { name: string; url: string } | null {
	const platform = os.platform();
	const arch = os.arch();
	const key = `${platform}-${arch}`;
	return BINARIES[key] || null;
}

/**
 * Get path to bundled binary (inside extension)
 */
function getBundledBinaryPath(context: vscode.ExtensionContext): string | null {
	const binary = getPlatformBinary();
	if (!binary) return null;
	
	const bundledPath = path.join(context.extensionPath, 'bin', binary.name);
	return fs.existsSync(bundledPath) ? bundledPath : null;
}

/**
 * Get path to store downloaded binary (in global storage)
 */
function getDownloadedBinaryPath(context: vscode.ExtensionContext): string {
	const binary = getPlatformBinary();
	if (!binary) {
		throw new Error(`Unsupported platform: ${os.platform()}-${os.arch()}`);
	}
	return path.join(context.globalStorageUri.fsPath, 'bin', binary.name);
}

/**
 * Check if binary exists and is executable
 */
function binaryExists(binaryPath: string): boolean {
	try {
		fs.accessSync(binaryPath, fs.constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if Node.js/npx is available
 */
function isNodeAvailable(): boolean {
	try {
		const { execSync } = require('child_process');
		execSync('npx --version', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

/**
 * Download binary from GitHub releases
 */
async function downloadBinary(context: vscode.ExtensionContext): Promise<string> {
	const binary = getPlatformBinary();
	if (!binary) {
		throw new Error(`Unsupported platform: ${os.platform()}-${os.arch()}`);
	}

	const binaryPath = getDownloadedBinaryPath(context);
	const binDir = path.dirname(binaryPath);

	// Create directory if needed
	if (!fs.existsSync(binDir)) {
		fs.mkdirSync(binDir, { recursive: true });
	}

	// Download with progress
	return new Promise((resolve, reject) => {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'AI-Archive MCP Server',
			cancellable: false
		}, async (progress) => {
			progress.report({ message: 'Downloading MCP server binary...' });

			const file = fs.createWriteStream(binaryPath);
			
			const download = (url: string) => {
				https.get(url, (response) => {
					// Handle redirects
					if (response.statusCode === 302 || response.statusCode === 301) {
						const redirectUrl = response.headers.location;
						if (redirectUrl) {
							download(redirectUrl);
							return;
						}
					}

					if (response.statusCode !== 200) {
						reject(new Error(`Download failed: HTTP ${response.statusCode}`));
						return;
					}

					const totalSize = parseInt(response.headers['content-length'] || '0', 10);
					let downloadedSize = 0;

					response.on('data', (chunk) => {
						downloadedSize += chunk.length;
						if (totalSize > 0) {
							const percent = Math.round((downloadedSize / totalSize) * 100);
							progress.report({ message: `Downloading... ${percent}%` });
						}
					});

					response.pipe(file);

					file.on('finish', () => {
						file.close();
						// Make executable on Unix
						if (os.platform() !== 'win32') {
							fs.chmodSync(binaryPath, 0o755);
						}
						progress.report({ message: 'Download complete!' });
						resolve(binaryPath);
					});
				}).on('error', (err) => {
					fs.unlink(binaryPath, () => {}); // Delete partial file
					reject(err);
				});
			};

			download(binary.url);
		});
	});
}

/**
 * Provider for AI-Archive MCP server definitions
 * Supports both bundled binary (no Node.js required) and npx fallback
 */
class AIarchiveMcpServerProvider implements vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> {
	private _onDidChangeMcpServerDefinitions = new vscode.EventEmitter<void>();
	readonly onDidChangeMcpServerDefinitions = this._onDidChangeMcpServerDefinitions.event;
	private context: vscode.ExtensionContext;
	private serverMode: 'binary' | 'npx' | 'unknown' = 'unknown';

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	/**
	 * Get the current server mode
	 */
	getServerMode(): string {
		return this.serverMode;
	}

	/**
	 * Provides available MCP servers for AI-Archive integration
	 * Priority: 1. Bundled binary, 2. npx (if Node.js available)
	 */
	async provideMcpServerDefinitions(token: vscode.CancellationToken): Promise<vscode.McpStdioServerDefinition[]> {
		const config = vscode.workspace.getConfiguration('ai-archive');
		const useModularServer = config.get<boolean>('useModularServer', true);
		const enabledModules = config.get<any>('enabledModules', {
			search: true,
			papers: true,
			agents: true,
			reviews: true,
			citations: true,
			marketplace: true,
			users: true
		});

		// Build enabled modules list for environment
		const enabledModulesList = Object.entries(enabledModules)
			.filter(([_, enabled]) => enabled)
			.map(([name, _]) => name)
			.join(',');

		// Common environment variables
		const env = {
			NODE_ENV: 'production',
			MCP_API_KEY: config.get<string>('apiKey') || '',
			MCP_USER_EMAIL: config.get<string>('userEmail') || '',
			API_BASE_URL: config.get<string>('apiBaseUrl', 'https://ai-archive.io/api/v1'),
			MCP_ENABLED_MODULES: enabledModulesList,
			NO_UPDATE_NOTIFIER: '1',
			npm_config_update_notifier: 'false'
		};

		let serverCommand: string;
		let serverArgs: string[];

		// Priority 1: Check for bundled binary (shipped with extension)
		const bundledBinaryPath = getBundledBinaryPath(this.context);
		if (bundledBinaryPath && binaryExists(bundledBinaryPath)) {
			this.serverMode = 'binary';
			serverCommand = bundledBinaryPath;
			serverArgs = useModularServer ? ['--modular'] : [];
			console.log('AI-Archive MCP: Using bundled binary');
		}
		// Priority 2: Check for previously downloaded binary
		else {
			const downloadedBinaryPath = getDownloadedBinaryPath(this.context);
			if (binaryExists(downloadedBinaryPath)) {
				this.serverMode = 'binary';
				serverCommand = downloadedBinaryPath;
				serverArgs = useModularServer ? ['--modular'] : [];
				console.log('AI-Archive MCP: Using downloaded binary');
			}
			// Priority 3: Use npx if Node.js is available
			else if (isNodeAvailable()) {
				this.serverMode = 'npx';
				serverCommand = 'npx';
				serverArgs = ['-y', 'ai-archive-mcp'];
				if (useModularServer) {
					serverArgs.push('--modular');
				}
				console.log('AI-Archive MCP: Using npx (Node.js detected)');
			}
			// Priority 4: Try to download binary
			else {
				this.serverMode = 'unknown';
				console.log('AI-Archive MCP: No binary or Node.js found, will attempt download');
				
				try {
					const newBinaryPath = await downloadBinary(this.context);
					this.serverMode = 'binary';
					serverCommand = newBinaryPath;
					serverArgs = useModularServer ? ['--modular'] : [];
				} catch (error) {
					vscode.window.showErrorMessage(
						'AI-Archive MCP Server requires either Node.js or a binary download. ' +
						'Please install Node.js from https://nodejs.org or check your internet connection.',
						'Install Node.js'
					).then(result => {
						if (result === 'Install Node.js') {
							vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org'));
						}
					});
					throw new Error('No runtime available for MCP server');
				}
			}
		}

		return [
			new vscode.McpStdioServerDefinition(
				'ai-archive',
				serverCommand,
				serverArgs,
				env,
				'1.0.0'
			)
		];
	}

	/**
	 * Resolves MCP server definition with user authentication if needed
	 */
	async resolveMcpServerDefinition(
		server: vscode.McpStdioServerDefinition, 
		token: vscode.CancellationToken
	): Promise<vscode.McpStdioServerDefinition> {
		const config = vscode.workspace.getConfiguration('ai-archive');
		let apiKey = config.get<string>('apiKey');

		// API key is optional for public features
		if (!apiKey) {
			const shouldConfigure = await vscode.window.showInformationMessage(
				'AI-Archive API key not configured. Public features (search, citations) will work, but paper submission and reviews require an API key.',
				'Configure Now',
				'Continue Without Key'
			);

			if (shouldConfigure === 'Configure Now') {
				apiKey = await vscode.window.showInputBox({
					prompt: 'Enter your AI-Archive API key (get it from https://ai-archive.io/api-keys)',
					password: true,
					placeHolder: 'Your API key...'
				});

				if (apiKey) {
					await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
				}
			}
		}

		return new vscode.McpStdioServerDefinition(
			server.label,
			server.command,
			server.args,
			{ ...server.env, MCP_API_KEY: apiKey || '' },
			server.version
		);
	}

	/**
	 * Refresh available servers
	 */
	refresh(): void {
		this._onDidChangeMcpServerDefinitions.fire();
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('AI-Archive MCP Server extension is now active!');

	// Check if MCP APIs are available
	if (!vscode.lm || !vscode.lm.registerMcpServerDefinitionProvider) {
		vscode.window.showWarningMessage(
			'MCP APIs are not available in this version of VS Code. Please use VS Code Insiders 1.96+ or VS Code Stable 1.103+',
			'Learn More'
		).then((result: string | undefined) => {
			if (result === 'Learn More') {
				vscode.env.openExternal(vscode.Uri.parse('https://github.com/microsoft/vscode/releases'));
			}
		});
		registerCommands(context, null);
		return;
	}

	// Create and register the MCP server definition provider
	const provider = new AIarchiveMcpServerProvider(context);
	const providerDisposable = vscode.lm.registerMcpServerDefinitionProvider(
		'ai-archive.mcp-servers',
		provider
	);

	// Register commands and UI
	const disposables = registerCommands(context, provider);

	// Listen for configuration changes
	const configDisposable = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
		if (e.affectsConfiguration('ai-archive')) {
			provider.refresh();
		}
	});

	context.subscriptions.push(providerDisposable, configDisposable, ...Object.values(disposables));

	// Show welcome message on first activation
	const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
	if (!hasShownWelcome) {
		context.globalState.update('hasShownWelcome', true);
		vscode.window.showInformationMessage(
			'AI-Archive MCP Server extension is now active! No additional setup required.',
			'Configure API Key',
			'Later'
		).then((result: string | undefined) => {
			if (result === 'Configure API Key') {
				vscode.commands.executeCommand('ai-archive-mcp-server.configureApiKey');
			}
		});
	}
}

function registerCommands(context: vscode.ExtensionContext, provider: AIarchiveMcpServerProvider | null) {
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = "$(globe) AI-Archive MCP";
	statusBarItem.tooltip = "AI-Archive MCP Server is active";
	statusBarItem.command = 'ai-archive-mcp-server.showStatus';
	statusBarItem.show();

	const statusCommand = vscode.commands.registerCommand('ai-archive-mcp-server.showStatus', async () => {
		const config = vscode.workspace.getConfiguration('ai-archive');
		const hasApiKey = config.get<string>('apiKey');
		const apiBaseUrl = config.get<string>('apiBaseUrl', 'https://ai-archive.io/api/v1');
		const useModularServer = config.get<boolean>('useModularServer', true);
		const enabledModules = config.get<any>('enabledModules', {});
		
		const mcpStatus = provider ? '✓ MCP Provider registered' : '⚠️ MCP APIs not available';
		const serverMode = provider ? provider.getServerMode() : 'unknown';
		const serverModeDisplay = serverMode === 'binary' ? 'Standalone Binary' : 
		                          serverMode === 'npx' ? 'NPX (Node.js)' : 'Not configured';
		const serverType = useModularServer ? 'Modular' : 'Monolithic';
		const enabledCount = Object.values(enabledModules).filter(Boolean).length;
		const totalModules = Object.keys(enabledModules).length;
		
		const message = `AI-Archive MCP Server Status:\n\n` +
			`${mcpStatus}\n` +
			`Runtime: ${serverModeDisplay}\n` +
			`Server Type: ${serverType}\n` +
			`Enabled Modules: ${enabledCount}/${totalModules}\n` +
			`API Base URL: ${apiBaseUrl}\n` +
			`API Key: ${hasApiKey ? 'Configured ✓' : 'Not configured (public features work)'}`;
		
		const actions = hasApiKey 
			? ['Configure Modules', 'Download Binary', 'Open Settings']
			: ['Configure API Key', 'Configure Modules', 'Open Settings'];
		
		const result = await vscode.window.showInformationMessage(message, ...actions);
		
		if (result === 'Configure API Key') {
			vscode.commands.executeCommand('ai-archive-mcp-server.configureApiKey');
		} else if (result === 'Configure Modules') {
			vscode.commands.executeCommand('ai-archive-mcp-server.configureModules');
		} else if (result === 'Open Settings') {
			vscode.commands.executeCommand('workbench.action.openSettings', 'ai-archive');
		} else if (result === 'Download Binary') {
			try {
				await downloadBinary(context);
				vscode.window.showInformationMessage('Binary downloaded successfully! Restart may be required.');
				if (provider) provider.refresh();
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to download binary: ${error}`);
			}
		}
	});

	const configCommand = vscode.commands.registerCommand('ai-archive-mcp-server.configureApiKey', async () => {
		const apiKey = await vscode.window.showInputBox({
			prompt: 'Enter your AI-Archive API key',
			password: true,
			placeHolder: 'Your API key...',
			validateInput: (value: string) => {
				if (!value || value.length === 0) return 'API key is required';
				if (value.includes('test-') || value.includes('123456')) return 'Please use a production API key';
				return null;
			}
		});

		if (apiKey) {
			const config = vscode.workspace.getConfiguration('ai-archive');
			await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
			vscode.window.showInformationMessage('API key configured successfully!');
			if (provider) provider.refresh();
		}
	});

	const moduleConfigCommand = vscode.commands.registerCommand('ai-archive-mcp-server.configureModules', async () => {
		createModuleConfigurationPanel(context, provider);
	});

	const resetCommand = vscode.commands.registerCommand('ai-archive-mcp-server.resetToDefaults', async () => {
		const result = await vscode.window.showWarningMessage(
			'Reset AI-Archive MCP configuration to defaults?',
			'Reset', 'Cancel'
		);
		
		if (result === 'Reset') {
			const config = vscode.workspace.getConfiguration('ai-archive');
			await config.update('enabledModules', {
				search: true, papers: true, agents: true, reviews: true,
				citations: true, marketplace: true, users: true
			}, vscode.ConfigurationTarget.Global);
			await config.update('useModularServer', true, vscode.ConfigurationTarget.Global);
			vscode.window.showInformationMessage('Configuration reset to defaults!');
			if (provider) provider.refresh();
		}
	});

	// Command to manually download/update binary
	const downloadCommand = vscode.commands.registerCommand('ai-archive-mcp-server.downloadBinary', async () => {
		try {
			const binaryPath = await downloadBinary(context);
			vscode.window.showInformationMessage(`Binary downloaded to: ${binaryPath}`);
			if (provider) provider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to download binary: ${error}`);
		}
	});

	return { statusBarItem, statusCommand, configCommand, moduleConfigCommand, resetCommand, downloadCommand };
}

function createModuleConfigurationPanel(context: vscode.ExtensionContext, provider: AIarchiveMcpServerProvider | null) {
	const panel = vscode.window.createWebviewPanel(
		'ai-archive-module-config',
		'AI-Archive MCP Module Configuration',
		vscode.ViewColumn.One,
		{ enableScripts: true, retainContextWhenHidden: true }
	);

	const config = vscode.workspace.getConfiguration('ai-archive');
	const enabledModules = config.get<any>('enabledModules', {
		search: true, papers: true, agents: true, reviews: true,
		citations: true, marketplace: true, users: true
	});
	const useModularServer = config.get<boolean>('useModularServer', true);

	panel.webview.html = getModuleConfigurationHtml(enabledModules, useModularServer);

	panel.webview.onDidReceiveMessage(
		async (message: { command: string; modules?: any; useModularServer?: boolean }) => {
			switch (message.command) {
				case 'saveConfig':
					await config.update('enabledModules', message.modules, vscode.ConfigurationTarget.Global);
					await config.update('useModularServer', message.useModularServer, vscode.ConfigurationTarget.Global);
					if (provider) provider.refresh();
					vscode.window.showInformationMessage(
						`Configuration saved! Enabled ${Object.values(message.modules!).filter(Boolean).length} modules.`
					);
					panel.dispose();
					break;
				case 'selectAll':
					panel.webview.postMessage({ command: 'updateModules', modules: {
						search: true, papers: true, agents: true, reviews: true,
						citations: true, marketplace: true, users: true
					}});
					break;
				case 'selectNone':
					panel.webview.postMessage({ command: 'updateModules', modules: {
						search: false, papers: false, agents: false, reviews: false,
						citations: false, marketplace: false, users: false
					}});
					break;
			}
		},
		undefined,
		context.subscriptions
	);
}

function getModuleConfigurationHtml(enabledModules: any, useModularServer: boolean): string {
	const modules = [
		{ key: 'search', name: 'Search & Discovery', description: 'Paper search, discovery, platform stats', tools: 4 },
		{ key: 'papers', name: 'Paper Management', description: 'Submit, manage, version papers', tools: 9 },
		{ key: 'agents', name: 'AI Agent Management', description: 'Create and manage AI agents', tools: 3 },
		{ key: 'reviews', name: 'Review System', description: 'Submit and manage peer reviews', tools: 4 },
		{ key: 'citations', name: 'Citation Analysis', description: 'Citation graphs and statistics', tools: 5 },
		{ key: 'marketplace', name: 'Reviewer Marketplace', description: 'Find and hire reviewers', tools: 12 },
		{ key: 'users', name: 'User Management', description: 'Profiles and notifications', tools: 8 }
	];

	const moduleCheckboxes = modules.map(m => `
		<div class="module-item">
			<label class="module-label">
				<input type="checkbox" id="${m.key}" ${enabledModules[m.key] ? 'checked' : ''}>
				<div class="module-info">
					<div class="module-header">
						<span class="module-name">${m.name}</span>
						<span class="tool-count">${m.tools} tools</span>
					</div>
					<div class="module-description">${m.description}</div>
				</div>
			</label>
		</div>
	`).join('');

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>AI-Archive MCP Module Configuration</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
		.header { margin-bottom: 24px; }
		.title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
		.subtitle { color: var(--vscode-descriptionForeground); margin-bottom: 16px; }
		.server-option { margin-bottom: 20px; padding: 12px; border: 1px solid var(--vscode-widget-border); border-radius: 4px; background-color: var(--vscode-input-background); }
		.modules-container { display: grid; gap: 12px; margin-bottom: 24px; }
		.module-item { border: 1px solid var(--vscode-widget-border); border-radius: 6px; padding: 16px; background-color: var(--vscode-input-background); transition: border-color 0.2s ease; }
		.module-item:hover { border-color: var(--vscode-focusBorder); }
		.module-label { display: flex; align-items: flex-start; cursor: pointer; gap: 12px; }
		.module-info { flex: 1; }
		.module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
		.module-name { font-weight: 500; font-size: 14px; }
		.tool-count { font-size: 12px; background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 2px 6px; border-radius: 3px; }
		.module-description { color: var(--vscode-descriptionForeground); font-size: 12px; }
		.controls { display: flex; gap: 12px; margin-bottom: 20px; }
		.button { background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
		.button:hover { background-color: var(--vscode-button-secondaryHoverBackground); }
		.primary-button { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; }
		.primary-button:hover { background-color: var(--vscode-button-hoverBackground); }
		.stats { margin-top: 16px; padding: 12px; background-color: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-textBlockQuote-border); border-radius: 3px; }
		input[type="checkbox"] { width: 16px; height: 16px; margin-top: 2px; }
	</style>
</head>
<body>
	<div class="header">
		<div class="title">AI-Archive MCP Module Configuration</div>
		<div class="subtitle">Select which modules to enable for your MCP server</div>
	</div>
	<div class="server-option">
		<label>
			<input type="checkbox" id="useModularServer" ${useModularServer ? 'checked' : ''}>
			Use Modular Server (Recommended)
		</label>
		<div style="margin-top: 4px; font-size: 12px; color: var(--vscode-descriptionForeground);">The modular server provides better performance and configurability</div>
	</div>
	<div class="controls">
		<button class="button" onclick="selectAll()">Select All</button>
		<button class="button" onclick="selectNone()">Select None</button>
	</div>
	<div class="modules-container">${moduleCheckboxes}</div>
	<div class="stats" id="stats">
		<div id="enabledCount">Enabled modules: 0</div>
		<div id="totalTools">Total tools available: 0</div>
	</div>
	<div style="margin-top: 24px;">
		<button class="primary-button" onclick="saveConfiguration()">Apply Configuration</button>
	</div>
	<script>
		const vscode = acquireVsCodeApi();
		function updateStats() {
			const checkboxes = document.querySelectorAll('.module-item input[type="checkbox"]');
			const toolCounts = [4, 9, 3, 4, 5, 12, 8];
			let enabledCount = 0, totalTools = 0;
			checkboxes.forEach((cb, i) => { if (cb.checked) { enabledCount++; totalTools += toolCounts[i]; } });
			document.getElementById('enabledCount').textContent = 'Enabled modules: ' + enabledCount + '/7';
			document.getElementById('totalTools').textContent = 'Total tools available: ' + totalTools;
		}
		document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', updateStats));
		function selectAll() { vscode.postMessage({ command: 'selectAll' }); }
		function selectNone() { vscode.postMessage({ command: 'selectNone' }); }
		function saveConfiguration() {
			const modules = {};
			document.querySelectorAll('.module-item input[type="checkbox"]').forEach(cb => { modules[cb.id] = cb.checked; });
			vscode.postMessage({ command: 'saveConfig', modules, useModularServer: document.getElementById('useModularServer').checked });
		}
		window.addEventListener('message', e => {
			if (e.data.command === 'updateModules') {
				Object.entries(e.data.modules).forEach(([k, v]) => { const cb = document.getElementById(k); if (cb) cb.checked = v; });
				updateStats();
			}
		});
		updateStats();
	</script>
</body>
</html>`;
}

export function deactivate() {}
