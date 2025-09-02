// Dockerizathinginator - Wails Frontend
// Converted from Eel to Wails

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

// Wails runtime check
function ensureWails() {
    if (typeof window.go === 'undefined') {
        console.error('Wails runtime not available');
        return false;
    }
    return true;
}

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
    // Sidebar navigation
    document.getElementById('connectionButton').addEventListener('click', () => showPane('#connectionPane', '#connectionButton'));
    document.getElementById('containerButton').addEventListener('click', () => showPane('#containerPane', '#containerButton'));
    document.getElementById('volumeButton').addEventListener('click', () => showPane('#volumePane', '#volumeButton'));
    document.getElementById('loggingButton').addEventListener('click', () => showPane('#loggingPane', '#loggingButton'));
    document.getElementById('backupButton').addEventListener('click', () => showPane('#backupPane', '#backupButton'));
    document.getElementById('summaryButton').addEventListener('click', () => showPane('#summaryPane', '#summaryButton'));

    // Connection test button
    document.getElementById('connectTest').addEventListener('click', testConnection);

    // Form input handlers
    document.getElementById('piHost').addEventListener('input', (e) => { host = e.target.value; });
    document.getElementById('piUser').addEventListener('input', (e) => { user = e.target.value; });
    document.getElementById('piPass').addEventListener('input', (e) => { piPass = e.target.value; });

    // Prevent form submission
    document.querySelector('form').addEventListener('submit', (e) => e.preventDefault());
}

function showPane(paneSelector, buttonSelector) {
    // Hide all panes
    const panes = ['#connectionPane', '#containerPane', '#volumePane', '#loggingPane', '#backupPane', '#summaryPane'];
    panes.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        }
    });

    // Show selected pane
    const selectedPane = document.querySelector(paneSelector);
    if (selectedPane) {
        selectedPane.style.display = 'block';
    }

    // Update active button
    setActiveButton(buttonSelector);
    
    activePane = paneSelector;
    activeButton = buttonSelector;
}

function setActiveButton(buttonSelector) {
    // Remove active styling from all buttons
    const buttons = document.querySelectorAll('.sidebar-icon');
    buttons.forEach(btn => {
        btn.classList.remove('bg-gray-800');
    });

    // Add active styling to selected button
    const activeBtn = document.querySelector(buttonSelector);
    if (activeBtn) {
        activeBtn.classList.add('bg-gray-800');
    }
}

// Connection testing (converted from Eel)
async function testConnection() {
    if (!ensureWails()) return;

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
        
        // Call Wails backend
        const result = await window.go.main.App.TestSSH(host, user, piPass);
        
        loader.style.display = 'none';
        connectBtn.disabled = false;

        if (result.success) {
            // Get Pi model
            const model = await window.go.main.App.GetModel(host, user, piPass);
            
            document.getElementById('modelSuccess').textContent = `Connected to: ${model}`;
            connectSuccess.style.display = 'block';
            connection = true;
            
            // Enable other navigation options
            enableNavigation();
        } else {
            document.getElementById('modelFail').textContent = result.message;
            connectFail.style.display = 'block';
            connection = false;
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        loader.style.display = 'none';
        connectBtn.disabled = false;
        
        document.getElementById('modelFail').textContent = `Connection failed: ${error.message}`;
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
function log(message) {
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