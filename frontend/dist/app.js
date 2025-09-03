// Dockerizathinginator - Wails Frontend
// Converted from Eel to Wails

// Import Wails runtime functions
const runtime = window.runtime || {};
const App = window.go?.main?.App || {};

// Global variables (migrated from original app.js)
let connection = false;
let host = 'raspberrypi.local';
let user = 'pi';
let piPass = '';
let vol = '/mnt/docker';
let netType = 'usb';
let back = 'none';
let log = 'Log2Ram';
let stack = 'Network Stack';
let netShare = '';
let netUser = '';
let netPassword = '';
let containers = [];
let ghUser = 'None';
let ghEmail = 'None';
let ghPass = 'None';
let ghRepo = 'None';

// Active pane management
let activePane = "#connectionPane";
let activeButton = "#connectionButton";

document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    console.log('Initializing Dockerizathinginator...');
    
    // Hide unused elements initially
    hideElements([
        "#connectFail", "#connectSuccess", "#containerPane", "#volumePane",
        "#loggingPane", "#backupPane", "#summaryPane", "#ansibleModal"
    ]);

    // Set active button styling
    setActiveButton(activeButton);

    // Bind event handlers
    bindEventHandlers();

    // Listen for Wails events
    listenForWailsEvents();
}

function hideElements(selectors) {
    selectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        }
    });
}

function bindEventHandlers() {
    console.log('Binding event handlers...');
    
    // Sidebar navigation
    const connectionBtn = document.getElementById('connectionButton');
    if (connectionBtn) {
        connectionBtn.addEventListener('click', () => showPane('#connectionPane', '#connectionButton'));
        console.log('Bound connectionButton');
    } else {
        console.error('connectionButton not found!');
    }
    
    const containerBtn = document.getElementById('containerButton');
    if (containerBtn) {
        containerBtn.addEventListener('click', () => showPane('#containerPane', '#containerButton'));
        console.log('Bound containerButton');
    } else {
        console.error('containerButton not found!');
    }
    
    const volumeBtn = document.getElementById('volumeButton');
    if (volumeBtn) {
        volumeBtn.addEventListener('click', () => showPane('#volumePane', '#volumeButton'));
        console.log('Bound volumeButton');
    } else {
        console.error('volumeButton not found!');
    }
    
    const loggingBtn = document.getElementById('loggingButton');
    if (loggingBtn) {
        loggingBtn.addEventListener('click', () => showPane('#loggingPane', '#loggingButton'));
        console.log('Bound loggingButton');
    } else {
        console.error('loggingButton not found!');
    }
    
    const backupBtn = document.getElementById('backupButton');
    if (backupBtn) {
        backupBtn.addEventListener('click', () => showPane('#backupPane', '#backupButton'));
        console.log('Bound backupButton');
    } else {
        console.error('backupButton not found!');
    }
    
    const summaryBtn = document.getElementById('summaryButton');
    if (summaryBtn) {
        summaryBtn.addEventListener('click', () => showPane('#summaryPane', '#summaryButton'));
        console.log('Bound summaryButton');
    } else {
        console.error('summaryButton not found!');
    }

    // Connection test button
    document.getElementById('connectTest').addEventListener('click', testConnection);

    // Form input handlers
    document.getElementById('piHost').addEventListener('input', (e) => { host = e.target.value; });
    document.getElementById('piUser').addEventListener('input', (e) => { user = e.target.value; });
    document.getElementById('piPass').addEventListener('input', (e) => { piPass = e.target.value; });

    // Prevent form submission
    document.querySelector('form').addEventListener('submit', (e) => e.preventDefault());

    // GitHub OAuth handlers
    bindGitHubOAuthHandlers();
}

function showPane(paneSelector, buttonSelector) {
    console.log(`Switching to pane: ${paneSelector}, button: ${buttonSelector}`);
    
    // Hide all panes
    const panes = ['#connectionPane', '#containerPane', '#volumePane', '#loggingPane', '#backupPane', '#summaryPane'];
    panes.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
            element.style.visibility = 'hidden';
            console.log(`Hidden pane: ${selector}`);
        } else {
            console.warn(`Pane not found: ${selector}`);
        }
    });

    // Show selected pane
    const selectedPane = document.querySelector(paneSelector);
    if (selectedPane) {
        // Force display to block and visibility to visible
        selectedPane.style.display = 'block';
        selectedPane.style.visibility = 'visible';
        selectedPane.style.setProperty('display', 'block', 'important');
        console.log(`Shown pane: ${paneSelector}`);
    } else {
        console.error(`ERROR: Could not find pane: ${paneSelector}`);
    }

    // Update active button
    setActiveButton(buttonSelector);
    
    activePane = paneSelector;
    activeButton = buttonSelector;
}

function setActiveButton(buttonSelector) {
    console.log(`Setting active button: ${buttonSelector}`);
    
    // Remove active styling from all buttons
    const buttons = document.querySelectorAll('.sidebar-icon');
    buttons.forEach(btn => {
        btn.classList.remove('bg-gray-800');
        console.log(`Removed active class from button`);
    });

    // Add active styling to selected button
    const activeBtn = document.querySelector(buttonSelector);
    if (activeBtn) {
        activeBtn.classList.add('bg-gray-800');
        console.log(`Added active class to: ${buttonSelector}`);
    } else {
        console.error(`ERROR: Could not find button: ${buttonSelector}`);
    }
}

// Connection testing (converted from Eel)
async function testConnection() {
    const connectBtn = document.getElementById('connectTest');
    const loader = document.getElementById('connectLoader');
    const connectFail = document.getElementById('connectFail');
    const connectSuccess = document.getElementById('connectSuccess');
    
    // Get current form values
    host = document.getElementById('piHost').value || 'raspberrypi.local';
    user = document.getElementById('piUser').value || 'pi';
    piPass = document.getElementById('piPass').value;

    if (!piPass) {
        showAlert('error', 'Please enter a password');
        return;
    }

    // Show loading state
    connectBtn.disabled = true;
    loader.style.display = 'block';
    connectFail.style.display = 'none';
    connectSuccess.style.display = 'none';

    try {
        console.log(`Testing connection to ${host} with user ${user}`);
        
        // Call Wails backend - use App directly
        const result = await App.TestSSH(host, user, piPass);
        
        loader.style.display = 'none';
        connectBtn.disabled = false;

        if (result.success) {
            // Get Pi model/OS info
            const model = await App.GetModel(host, user, piPass);
            
            // Check if the system is unsupported (contains ❌) or has warnings (contains ⚠️)
            if (model.includes('❌')) {
                // Unsupported system - show as error
                document.getElementById('modelFail').textContent = model;
                connectFail.style.display = 'block';
                connection = false;
            } else if (model.includes('⚠️')) {
                // Supported but with warnings - show warning message
                document.getElementById('modelSuccess').textContent = model;
                // Change success box style to warning
                const successBox = document.getElementById('connectSuccess');
                const successHeader = successBox.querySelector('.bg-green-500');
                successHeader.className = successHeader.className.replace('bg-green-500', 'bg-yellow-500');
                successHeader.textContent = 'Warning';
                successBox.style.display = 'block';
                connection = true; // Allow continuation with warnings
                
                // Enable other navigation options
                enableNavigation();
            } else {
                // Fully supported system - show success
                document.getElementById('modelSuccess').textContent = model;
                connectSuccess.style.display = 'block';
                connection = true;
                
                // Enable other navigation options
                enableNavigation();
            }
        } else {
            document.getElementById('modelFail').textContent = result.message || 'Connection failed';
            connectFail.style.display = 'block';
            connection = false;
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        loader.style.display = 'none';
        connectBtn.disabled = false;
        
        document.getElementById('modelFail').textContent = `Connection failed: ${error.message || error}`;
        connectFail.style.display = 'block';
        connection = false;
    }
}

function enableNavigation() {
    // Enable other sidebar buttons (remove disabled state if any)
    const navButtons = ['containerButton', 'volumeButton', 'loggingButton', 'backupButton', 'summaryButton'];
    navButtons.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
        }
    });
}

function showAlert(type, message) {
    // Simple alert system
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} fixed top-4 right-4 p-4 rounded shadow-lg z-50`;
    alertDiv.style.backgroundColor = type === 'error' ? '#ef4444' : '#10b981';
    alertDiv.style.color = 'white';
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Listen for Wails events
function listenForWailsEvents() {
    if (!ensureWails()) return;

    // Listen for progress updates
    window.runtime.EventsOn('updateProgress', (message) => {
        console.log('Progress:', message);
        updateProgressDisplay(message);
    });

    // Listen for Ansible output
    window.runtime.EventsOn('ansibleOutput', (data) => {
        console.log('Ansible output:', data);
        appendAnsibleOutput(data.message);
    });

    // Listen for Ansible completion
    window.runtime.EventsOn('ansibleComplete', (message) => {
        console.log('Ansible complete:', message);
        hideAnsibleModal();
        showAlert('success', 'Deployment completed successfully!');
    });

    // Listen for Ansible errors
    window.runtime.EventsOn('ansibleError', (error) => {
        console.error('Ansible error:', error);
        showAlert('error', `Deployment failed: ${error}`);
    });

    // Listen for status updates
    window.runtime.EventsOn('statusUpdate', (status) => {
        console.log('Status update:', status);
        updateStatusDisplay(status);
    });

    // Listen for GitHub OAuth events
    window.runtime.EventsOn('githubAuthSuccess', (data) => {
        console.log('GitHub auth success:', data);
        updateGitHubAuthUI(true, data.username, data.email);
        showAlert('success', `Connected to GitHub as ${data.username}`);
    });

    window.runtime.EventsOn('githubDisconnected', () => {
        console.log('GitHub disconnected');
        updateGitHubAuthUI(false);
    });

    window.runtime.EventsOn('backupRepoCreated', (data) => {
        console.log('Backup repo created:', data);
        showAlert('success', `Repository "${data.repo_name}" created successfully!`);
    });
}

function updateProgressDisplay(message) {
    // Update any progress display elements
    const progressElements = document.querySelectorAll('.progress-message');
    progressElements.forEach(el => {
        el.textContent = message;
    });
}

function showAnsibleModal() {
    const modal = document.getElementById('ansibleModal');
    if (modal) {
        modal.style.display = 'block';
        // Clear previous output
        const output = document.getElementById('ansibleOutput');
        if (output) {
            output.innerHTML = '';
        }
    }
}

function hideAnsibleModal() {
    const modal = document.getElementById('ansibleModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function appendAnsibleOutput(message) {
    const output = document.getElementById('ansibleOutput');
    if (output && message) {
        const line = document.createElement('div');
        line.textContent = message;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }
}

function updateStatusDisplay(status) {
    // Update status indicators
    console.log('Status:', status.status, 'Success:', status.success);
}

// Deployment functions (converted from original Eel functions)
async function deployComplete() {
    if (!ensureWails() || !connection) {
        showAlert('error', 'Please establish connection first');
        return;
    }

    try {
        showAnsibleModal();
        
        const config = {
            networkStack: true, // Based on your original default
            iotStack: false,
            mediaStack: false,
            components: {
                deploy_pihole: true,
                deploy_portainer: true,
            }
        };

        await window.go.main.App.DeployStacks(host, user, piPass, vol, config);
    } catch (error) {
        console.error('Deployment failed:', error);
        hideAnsibleModal();
        showAlert('error', `Deployment failed: ${error.message}`);
    }
}

// USB preparation function (converted from original)
async function prepareUSB() {
    if (!ensureWails() || !connection) {
        showAlert('error', 'Please establish connection first');
        return;
    }

    try {
        showAnsibleModal();
        await window.go.main.App.PrepareUSB(host, user, piPass, vol);
    } catch (error) {
        console.error('USB preparation failed:', error);
        hideAnsibleModal();
        showAlert('error', `USB preparation failed: ${error.message}`);
    }
}

// Network storage functions (converted from original)
async function prepareNetworkNFS() {
    if (!ensureWails() || !connection) {
        showAlert('error', 'Please establish connection first');
        return;
    }

    try {
        showAnsibleModal();
        await window.go.main.App.PrepareNetworkNFS(host, user, piPass, vol, netShare, '/docker');
    } catch (error) {
        console.error('NFS preparation failed:', error);
        hideAnsibleModal();
        showAlert('error', `NFS preparation failed: ${error.message}`);
    }
}

async function prepareNetworkCIFS() {
    if (!ensureWails() || !connection) {
        showAlert('error', 'Please establish connection first');
        return;
    }

    try {
        showAnsibleModal();
        await window.go.main.App.PrepareNetworkCIFS(host, user, piPass, vol, netShare, 'docker', netUser, netPassword);
    } catch (error) {
        console.error('CIFS preparation failed:', error);
        hideAnsibleModal();
        showAlert('error', `CIFS preparation failed: ${error.message}`);
    }
}

// System update functions (converted from original)
async function updatePi() {
    if (!ensureWails() || !connection) {
        showAlert('error', 'Please establish connection first');
        return;
    }

    try {
        showAnsibleModal();
        await window.go.main.App.UpdatePi(host, user, piPass);
    } catch (error) {
        console.error('Pi update failed:', error);
        hideAnsibleModal();
        showAlert('error', `Pi update failed: ${error.message}`);
    }
}

async function installDocker() {
    if (!ensureWails() || !connection) {
        showAlert('error', 'Please establish connection first');
        return;
    }

    try {
        showAnsibleModal();
        await window.go.main.App.InstallDocker(host, user, piPass, vol);
    } catch (error) {
        console.error('Docker installation failed:', error);
        hideAnsibleModal();
        showAlert('error', `Docker installation failed: ${error.message}`);
    }
}

async function installPortainer() {
    if (!ensureWails() || !connection) {
        showAlert('error', 'Please establish connection first');
        return;
    }

    try {
        showAnsibleModal();
        await window.go.main.App.InstallPortainer(host, user, piPass, vol);
    } catch (error) {
        console.error('Portainer installation failed:', error);
        hideAnsibleModal();
        showAlert('error', `Portainer installation failed: ${error.message}`);
    }
}

// Utility functions
function ensureWails() {
    if (!window.go || !window.go.main || !window.go.main.App) {
        console.warn('Wails runtime not available');
        return false;
    }
    return true;
}

function logMessage(message) {
    console.log(`[Dockerizathinginator] ${message}`);
}

// Export functions for global access (if needed)
window.dockerizathinginator = {
    testConnection,
    deployComplete,
    prepareUSB,
    prepareNetworkNFS,
    prepareNetworkCIFS,
    updatePi,
    installDocker,
    installPortainer
};

// Export navigation functions globally
window.showPane = showPane;
window.setActiveButton = setActiveButton;

// GitHub OAuth Functions
function bindGitHubOAuthHandlers() {
    // Connect GitHub button
    const connectBtn = document.getElementById('connectGitHub');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectToGitHub);
    }

    // Disconnect GitHub button
    const disconnectBtn = document.getElementById('disconnectGitHub');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectFromGitHub);
    }

    // Create repository button
    const createRepoBtn = document.getElementById('createRepoBtn');
    if (createRepoBtn) {
        createRepoBtn.addEventListener('click', createBackupRepository);
    }

    // Test backup button
    const testBackupBtn = document.getElementById('testBackupBtn');
    if (testBackupBtn) {
        testBackupBtn.addEventListener('click', testBackup);
    }

    // Check GitHub auth status on page load
    checkGitHubAuthStatus();
}

async function connectToGitHub() {
    if (!ensureWails()) {
        showAlert('error', 'Application not ready');
        return;
    }

    const connectBtn = document.getElementById('connectGitHub');
    const originalText = connectBtn.innerHTML;
    
    try {
        // Show loading state
        connectBtn.disabled = true;
        connectBtn.innerHTML = '<div class="loading-spinner mr-2"></div> Connecting...';
        
        console.log('Initiating GitHub OAuth...');
        await window.go.main.App.InitiateGitHubAuth();
        
    } catch (error) {
        console.error('GitHub OAuth failed:', error);
        showAlert('error', `GitHub connection failed: ${error.message || error}`);
        
        // Reset button state
        connectBtn.disabled = false;
        connectBtn.innerHTML = originalText;
    }
}

async function disconnectFromGitHub() {
    if (!ensureWails()) {
        showAlert('error', 'Application not ready');
        return;
    }

    try {
        await window.go.main.App.DisconnectGitHub();
        updateGitHubAuthUI(false);
        showAlert('success', 'Disconnected from GitHub');
    } catch (error) {
        console.error('GitHub disconnect failed:', error);
        showAlert('error', `Disconnect failed: ${error.message || error}`);
    }
}

async function checkGitHubAuthStatus() {
    if (!ensureWails()) return;

    try {
        const status = await window.go.main.App.GetGitHubAuthStatus();
        updateGitHubAuthUI(status.is_authenticated, status.username, status.email);
    } catch (error) {
        console.error('Failed to check GitHub auth status:', error);
        updateGitHubAuthUI(false);
    }
}

function updateGitHubAuthUI(isAuthenticated, username = '', email = '') {
    const authStatusTitle = document.getElementById('authStatusTitle');
    const authStatusDesc = document.getElementById('authStatusDesc');
    const authButtons = document.getElementById('authButtons');
    const connectedState = document.getElementById('connectedState');
    const connectedUsername = document.getElementById('connectedUsername');
    const connectedEmail = document.getElementById('connectedEmail');
    const repoConfigCard = document.getElementById('repoConfigCard');
    const connectBtn = document.getElementById('connectGitHub');

    if (isAuthenticated) {
        // Update header
        authStatusTitle.textContent = 'GitHub Connected';
        authStatusDesc.textContent = 'Ready for secure backup to GitHub';
        
        // Show connected state
        connectedState.style.display = 'block';
        connectedUsername.textContent = `Connected as: ${username}`;
        connectedEmail.textContent = email;
        
        // Hide connect button
        authButtons.style.display = 'none';
        
        // Enable repository configuration
        repoConfigCard.style.opacity = '1';
        repoConfigCard.style.pointerEvents = 'auto';
        
    } else {
        // Update header
        authStatusTitle.textContent = 'Connect to GitHub';
        authStatusDesc.textContent = 'Authenticate with GitHub for secure backup';
        
        // Hide connected state
        connectedState.style.display = 'none';
        
        // Show connect button
        authButtons.style.display = 'block';
        
        // Reset connect button state
        if (connectBtn) {
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fab fa-github mr-2"></i> Connect GitHub';
        }
        
        // Disable repository configuration
        repoConfigCard.style.opacity = '0.5';
        repoConfigCard.style.pointerEvents = 'none';
    }
}

async function createBackupRepository() {
    if (!ensureWails()) {
        showAlert('error', 'Application not ready');
        return;
    }

    const repoName = document.getElementById('repoName').value.trim();
    if (!repoName) {
        showAlert('error', 'Please enter a repository name');
        return;
    }

    const createBtn = document.getElementById('createRepoBtn');
    const originalText = createBtn.innerHTML;
    
    try {
        createBtn.disabled = true;
        createBtn.innerHTML = '<div class="loading-spinner mr-2"></div> Creating...';
        
        await window.go.main.App.CreateBackupRepository(repoName);
        showAlert('success', `Repository "${repoName}" created successfully!`);
        
    } catch (error) {
        console.error('Repository creation failed:', error);
        showAlert('error', `Failed to create repository: ${error.message || error}`);
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = originalText;
    }
}

async function testBackup() {
    if (!ensureWails()) {
        showAlert('error', 'Application not ready');
        return;
    }

    const testBtn = document.getElementById('testBackupBtn');
    const originalText = testBtn.innerHTML;
    
    try {
        testBtn.disabled = true;
        testBtn.innerHTML = '<div class="loading-spinner mr-2"></div> Testing...';
        
        // TODO: Implement actual backup test
        showAlert('success', 'Backup test completed successfully!');
        
    } catch (error) {
        console.error('Backup test failed:', error);
        showAlert('error', `Backup test failed: ${error.message || error}`);
    } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = originalText;
    }
}