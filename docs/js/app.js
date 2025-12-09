// Initialize storage system
const storage = new KrakenDutyStorage();

// Scenario templates remain the same
const scenarioTemplates = {
    example01: { summary: "Application unresponsive - multiple user reports", severity: "error", source: "app-server-02.us-east-4.com", component: "E-commerce Application", group: "Application Stack", class: "Availability", customDetails: { error_rate: "15%", response_time: "10s", affected_users: "500+" } },
    example02: { summary: "Container orchestration system failure - multiple pods crashing", severity: "critical", source: "k8s-cluster-01.us-east-1.com", component: "Kubernetes Cluster", group: "Container Platform", class: "Availability", customDetails: { failed_pods: "12", memory_usage: "93%", restart_count: "25" } },
    example03: { summary: "Excessive CPU usage detected on production web server", severity: "critical", source: "web-server-05.us-east-2.com", component: "Apache Web Server", group: "Web Infrastructure", class: "Performance", customDetails: { cpu_usage: "95%", process_count: "250", load_average: "8.5" } },
    example04: { summary: "High latency and connection timeouts in primary database cluster", severity: "critical", source: "db-cluster-01.us-east-1.com", component: "PostgreSQL", group: "Database Infrastructure", class: "Performance Degradation", customDetails: { db_name: "primary_cluster", connection_count: "500", avg_query_time: "2.5s" } },
    example05: { summary: "Critical disk space shortage on file server", severity: "critical", source: "file-server-03.us-east-3.com", component: "Storage System", group: "Storage Infrastructure", class: "Capacity", customDetails: { disk_usage: "98%", free_space: "20GB", affected_partition: "/dev/sda1" } },
    example06: { summary: "Multiple failed login attempts detected", severity: "error", source: "auth-server-01.us-west-1.com", component: "Authentication Service", group: "Login", class: "Security Threat", customDetails: { failed_attempts: "100+", affected_accounts: "25", source_ip: "192.168.1.100" } },
    example07: { summary: "Network connectivity issues affecting multiple services", severity: "critical", source: "core-switch-01.us-west-2.com", component: "Core Network Infrastructure", group: "Network", class: "Connectivity", customDetails: { packet_loss: "25%", affected_vlans: "VLAN 10, VLAN 20", bandwidth_utilization: "90%" } }
};

let currentRoutingKey = '';
let currentRoutingKeyId = null;

/**
 * Enhanced routing key management with persistent storage
 */
function maskRoutingKey(key) {
    if (!key) return '';
    const maskLength = Math.min(20, key.length);
    return '•'.repeat(maskLength) + key.slice(maskLength);
}

function handleRoutingKeyInput(event) {
    const inputField = event.target;
    const cursorPosition = inputField.selectionStart;
    const currentValue = inputField.value;

    // Update current routing key
    if (currentValue !== maskRoutingKey(currentRoutingKey)) {
        if (!currentValue.includes('•')) {
            currentRoutingKey = currentValue;
            currentRoutingKeyId = null; // Reset ID when manually typing
        } else {
            const visiblePart = currentValue.slice(20);
            currentRoutingKey = currentRoutingKey.slice(0, 20) + visiblePart;
        }
    }

    // Validate routing key
    validateRoutingKey(currentRoutingKey);

    // Show masked version in UI
    setTimeout(() => {
        inputField.value = maskRoutingKey(currentRoutingKey);
        if (cursorPosition > 20) {
            inputField.selectionStart = cursorPosition;
            inputField.selectionEnd = cursorPosition;
        }
    }, 0);
}

function validateRoutingKey(key) {
    const field = document.getElementById('routing_key');
    const existingMessage = field.parentNode.querySelector('.validation-message');

    if (existingMessage) {
        existingMessage.remove();
    }

    if (!key) {
        field.classList.remove('field-success', 'field-error');
        return;
    }

    // Basic validation - PagerDuty routing keys are typically 32 characters
    if (key.length == 32) {
        field.classList.add('field-success');
        field.classList.remove('field-error');
        const message = document.createElement('div');
        message.className = 'validation-message validation-success';
        message.textContent = 'Routing key format looks good';
        field.parentNode.appendChild(message);
    } else {
        field.classList.add('field-error');
        field.classList.remove('field-success');
        const message = document.createElement('div');
        message.className = 'validation-message validation-error';
        message.textContent = 'Routing key appears to be incomplete (typically 32 characters)';
        field.parentNode.appendChild(message);
    }
}

function saveCurrentRoutingKey() {
    if (!currentRoutingKey) {
        showToast('Please enter a routing key first', 'warning');
        return;
    }

    const name = prompt('Enter a name for this routing key:');
    if (!name || !name.trim()) {
        showToast('Please provide a name for the routing key', 'warning');
        return;
    }

    try {
        const id = storage.saveRoutingKey(name, currentRoutingKey);
        if (id) {
            currentRoutingKeyId = id;
            showToast(`Routing key "${name.trim()}" saved successfully!`, 'success');
        } else {
            showToast('Failed to save routing key', 'error');
        }
    } catch (error) {
        // Handle duplicate name error
        const suggestedName = storage.suggestAlternativeName(name.trim(), 'routingKey');
        const useAlternative = confirm(`${error.message}\n\nWould you like to use "${suggestedName}" instead?`);

        if (useAlternative) {
            try {
                const id = storage.saveRoutingKey(suggestedName, currentRoutingKey);
                if (id) {
                    currentRoutingKeyId = id;
                    showToast(`Routing key "${suggestedName}" saved successfully!`, 'success');
                } else {
                    showToast('Failed to save routing key', 'error');
                }
            } catch (secondError) {
                showToast(`Error: ${secondError.message}`, 'error');
            }
        } else {
            showToast('Routing key not saved', 'info');
        }
    }
}

function toggleRoutingKeyDropdown() {
    const dropdown = document.getElementById('routing-key-dropdown');
    const keys = storage.getRoutingKeys();

    if (keys.length === 0) {
        showToast('No saved routing keys found', 'info');
        return;
    }

    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
        return;
    }

    dropdown.innerHTML = '';
    keys.forEach(keyData => {
        const item = document.createElement('div');
        item.className = 'routing-key-item';
        item.innerHTML = `
            <div>
                <div class="routing-key-name">${escapeHtml(keyData.name)}</div>
                <div class="routing-key-preview">${maskRoutingKey(keyData.key)}</div>
            </div>
            <button class="routing-key-delete" onclick="deleteRoutingKey('${keyData.id}', event)">×</button>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('routing-key-delete')) return;
            loadRoutingKey(keyData.id);
            dropdown.style.display = 'none';
        });

        dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
}

function loadRoutingKey(id) {
    const keyData = storage.getRoutingKey(id);
    if (!keyData) {
        showToast('Routing key not found', 'error');
        return;
    }

    currentRoutingKey = keyData.key;
    currentRoutingKeyId = id;
    document.getElementById('routing_key').value = maskRoutingKey(keyData.key);
    storage.updateRoutingKeyUsage(id);
    validateRoutingKey(keyData.key);
    showToast(`Loaded routing key: ${keyData.name}`, 'success');
    updatePayload();
}

function deleteRoutingKey(id, event) {
    event.stopPropagation();
    const keyData = storage.getRoutingKey(id);
    if (!keyData) return;

    if (confirm(`Delete routing key "${keyData.name}"?`)) {
        if (storage.deleteRoutingKey(id)) {
            showToast(`Deleted routing key: ${keyData.name}`, 'success');
            toggleRoutingKeyDropdown(); // Refresh dropdown
            if (currentRoutingKeyId === id) {
                currentRoutingKey = '';
                currentRoutingKeyId = null;
                document.getElementById('routing_key').value = '';
            }
        } else {
            showToast('Failed to delete routing key', 'error');
        }
    }
}

/**
 * Enhanced scenario set management
 */
function saveScenarioSet() {
    const scenarios = document.querySelectorAll('.scenario');
    if (scenarios.length === 0) {
        showToast('No scenarios to save!', 'warning');
        return;
    }

    const name = prompt('Enter a name for this scenario set:');
    if (!name || !name.trim()) {
        showToast('Please provide a name for the scenario set', 'warning');
        return;
    }

    try {
        const scenariosData = Array.from(scenarios).map(scenario => {
            const scenarioId = scenario.id;
            return extractScenarioData(scenarioId);
        });

        const id = storage.saveScenarioSet(name, scenariosData, currentRoutingKeyId);
        if (id) {
            showToast(`Scenario set "${name.trim()}" saved successfully!`, 'success');
        } else {
            showToast('Failed to save scenario set', 'error');
        }
    } catch (error) {
        if (error.message.includes('already exists')) {
            // Handle duplicate name error
            const suggestedName = storage.suggestAlternativeName(name.trim(), 'scenarioSet');
            const useAlternative = confirm(`${error.message}\n\nWould you like to use "${suggestedName}" instead?`);

            if (useAlternative) {
                try {
                    const scenariosData = Array.from(scenarios).map(scenario => {
                        const scenarioId = scenario.id;
                        return extractScenarioData(scenarioId);
                    });

                    const id = storage.saveScenarioSet(suggestedName, scenariosData, currentRoutingKeyId);
                    if (id) {
                        showToast(`Scenario set "${suggestedName}" saved successfully!`, 'success');
                    } else {
                        showToast('Failed to save scenario set', 'error');
                    }
                } catch (secondError) {
                    showToast(`Error: ${secondError.message}`, 'error');
                }
            } else {
                showToast('Scenario set not saved', 'info');
            }
        } else {
            console.error('Error saving scenario set:', error);
            showToast(`Error saving scenario set: ${error.message}`, 'error');
        }
    }
}

function loadScenarioSetUI() {
    const sets = storage.getScenarioSets();
    if (sets.length === 0) {
        showToast('No saved scenario sets found', 'info');
        return;
    }

    const setNames = sets.map(set => `${set.name} (${set.scenarios.length} scenarios)`);
    const selectedIndex = prompt(`Select a scenario set to load:\n${setNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}\n\nEnter the number:`);

    if (selectedIndex && !isNaN(selectedIndex)) {
        const index = parseInt(selectedIndex) - 1;
        if (index >= 0 && index < sets.length) {
            loadScenarioSet(sets[index].id);
        } else {
            showToast('Invalid selection', 'warning');
        }
    }
}

// Enhanced management UI with rename functionality
function manageRoutingKeysUI() {
    const keys = storage.getRoutingKeys();
    if (keys.length === 0) {
        showToast('No saved routing keys found', 'info');
        return;
    }

    const keyList = keys.map((key, i) =>
        `${i + 1}. ${key.name} - Created: ${new Date(key.created).toLocaleDateString()}`
    ).join('\n');

    const action = prompt(`Routing Key Management:\n${keyList}\n\nEnter 'delete X' to delete key X, 'rename X' to rename key X, or click 'cancel' to exit:`);

    if (!action || action.toLowerCase() === 'cancel') {
        return; // User cancelled or entered 'cancel'
    }

    if (action.toLowerCase().startsWith('delete ')) {
        const index = parseInt(action.split(' ')[1]) - 1;
        if (index >= 0 && index < keys.length) {
            const keyToDelete = keys[index];
            if (confirm(`Delete routing key "${keyToDelete.name}"?`)) {
                if (storage.deleteRoutingKey(keyToDelete.id)) {
                    showToast(`Deleted routing key: ${keyToDelete.name}`, 'success');
                    if (currentRoutingKeyId === keyToDelete.id) {
                        currentRoutingKey = '';
                        currentRoutingKeyId = null;
                        document.getElementById('routing_key').value = '';
                    }
                } else {
                    showToast('Failed to delete routing key', 'error');
                }
            }
        } else {
            showToast('Invalid selection', 'warning');
        }
    } else if (action.toLowerCase().startsWith('rename ')) {
        const index = parseInt(action.split(' ')[1]) - 1;
        if (index >= 0 && index < keys.length) {
            const keyToRename = keys[index];
            const newName = prompt(`Enter new name for "${keyToRename.name}":`, keyToRename.name);
            if (newName && newName.trim() && newName.trim() !== keyToRename.name) {
                try {
                    if (storage.updateRoutingKey(keyToRename.id, newName, keyToRename.key)) {
                        showToast(`Renamed routing key to: ${newName.trim()}`, 'success');
                    } else {
                        showToast('Failed to rename routing key', 'error');
                    }
                } catch (error) {
                    showToast(`Error: ${error.message}`, 'error');
                }
            }
        } else {
            showToast('Invalid selection', 'warning');
        }
    } else {
        // Invalid command entered
        showToast('Wrong choice. Please enter "delete X", "rename X", or click "cancel".', 'warning');
    }
}

function updateScenarioDisplay(text = '') {
    const displayElement = document.getElementById('scenario-display');
    if (text) {
        displayElement.textContent = text;
        displayElement.style.display = 'inline';
    } else {
        displayElement.style.display = 'none';
    }
}

function loadScenarioSet(id) {
    const setData = storage.getScenarioSet(id);
    if (!setData) {
        showToast('Scenario set not found', 'error');
        return;
    }

    try {
        // Load associated routing key if available
        if (setData.routingKeyId) {
            const keyData = storage.getRoutingKey(setData.routingKeyId);
            if (keyData) {
                currentRoutingKey = keyData.key;
                currentRoutingKeyId = setData.routingKeyId;
                document.getElementById('routing_key').value = maskRoutingKey(keyData.key);
                storage.updateRoutingKeyUsage(setData.routingKeyId);
            }
        }

        // Clear existing scenarios
        document.getElementById('scenarios-container').innerHTML = '';

        // Load scenarios
        setData.scenarios.forEach((scenarioData, index) => {
            const scenarioId = createScenarioFromData(scenarioData, index + 1);
            populateScenarioData(scenarioId, scenarioData);
        });

        storage.updateScenarioSetUsage(id);

        // Update the scenario display - CHANGED THIS LINE
        updateScenarioDisplay(`Loaded scenario: "${setData.name}"`);

        showToast(`Loaded scenario set: ${setData.name}`, 'success');
        updatePayload();
    } catch (error) {
        console.error('Error loading scenario set:', error);
        showToast('Error loading scenario set!', 'error');
    }
}

function manageScenarioSetsUI() {
    const sets = storage.getScenarioSets();
    if (sets.length === 0) {
        showToast('No saved scenario sets found', 'info');
        return;
    }

    const setList = sets.map((set, i) =>
        `${i + 1}. ${set.name} (${set.scenarios.length} scenarios) - Created: ${new Date(set.created).toLocaleDateString()}`
    ).join('\n');

    const action = prompt(`Scenario Set Management:\n${setList}\n\nEnter 'delete X' to delete set X, 'rename X' to rename set X, or click 'cancel' to exit:`);

    if (!action || action.toLowerCase() === 'cancel') {
        return; // User cancelled or entered 'cancel'
    }

    if (action.toLowerCase().startsWith('delete ')) {
        const index = parseInt(action.split(' ')[1]) - 1;
        if (index >= 0 && index < sets.length) {
            const setToDelete = sets[index];
            if (confirm(`Delete scenario set "${setToDelete.name}"?`)) {
                if (storage.deleteScenarioSet(setToDelete.id)) {
                    showToast(`Deleted scenario set: ${setToDelete.name}`, 'success');
                } else {
                    showToast('Failed to delete scenario set', 'error');
                }
            }
        } else {
            showToast('Invalid selection', 'warning');
        }
    } else if (action.toLowerCase().startsWith('rename ')) {
        const index = parseInt(action.split(' ')[1]) - 1;
        if (index >= 0 && index < sets.length) {
            const setToRename = sets[index];
            const newName = prompt(`Enter new name for "${setToRename.name}":`, setToRename.name);
            if (newName && newName.trim() && newName.trim() !== setToRename.name) {
                try {
                    if (storage.updateScenarioSet(setToRename.id, newName, setToRename.scenarios, setToRename.routingKeyId)) {
                        showToast(`Renamed scenario set to: ${newName.trim()}`, 'success');
                    } else {
                        showToast('Failed to rename scenario set', 'error');
                    }
                } catch (error) {
                    showToast(`Error: ${error.message}`, 'error');
                }
            }
        } else {
            showToast('Invalid selection', 'warning');
        }
    } else {
        // Invalid command entered
        showToast('Wrong choice. Please enter "delete X", "rename X", or click "cancel".', 'warning');
    }
}

/**
 * Enhanced scenario management functions
 */
function extractScenarioData(scenarioId) {
    const componentField = document.getElementById(`${scenarioId}-component-field`);
    const groupField = document.getElementById(`${scenarioId}-group-field`);
    const classField = document.getElementById(`${scenarioId}-class-field`);

    return {
        type: document.getElementById(`${scenarioId}-type`).value,
        summary: document.getElementById(`${scenarioId}-summary`).value,
        severity: document.getElementById(`${scenarioId}-severity`).value,
        source: document.getElementById(`${scenarioId}-source`).value,
        component: componentField && componentField.style.display !== 'none' ?
            document.getElementById(`${scenarioId}-component`).value : '',
        group: groupField && groupField.style.display !== 'none' ?
            document.getElementById(`${scenarioId}-group`).value : '',
        class: classField && classField.style.display !== 'none' ?
            document.getElementById(`${scenarioId}-class`).value : '',
        removedFields: {
            component: !componentField || componentField.style.display === 'none',
            group: !groupField || groupField.style.display === 'none',
            class: !classField || classField.style.display === 'none'
        },
        customDetails: getCustomDetails(scenarioId)
    };
}

function createScenarioFromData(scenarioData, scenarioNumber) {
    const container = document.getElementById('scenarios-container');
    const scenarioId = `scenario-${Date.now()}-${scenarioNumber}`;

    const scenarioHtml = createScenarioHTML(scenarioId, scenarioNumber);
    container.insertAdjacentHTML('beforeend', scenarioHtml);

    return scenarioId;
}

function populateScenarioData(scenarioId, scenarioData) {
    // Set basic fields
    document.getElementById(`${scenarioId}-type`).value = scenarioData.type;
    document.getElementById(`${scenarioId}-summary`).value = scenarioData.summary;
    document.getElementById(`${scenarioId}-severity`).value = scenarioData.severity;
    document.getElementById(`${scenarioId}-source`).value = scenarioData.source;

    // Handle optional fields
    const componentField = document.getElementById(`${scenarioId}-component-field`);
    const groupField = document.getElementById(`${scenarioId}-group-field`);
    const classField = document.getElementById(`${scenarioId}-class-field`);

    if (scenarioData.removedFields?.component) {
        componentField.style.display = 'none';
    } else {
        document.getElementById(`${scenarioId}-component`).value = scenarioData.component || '';
    }

    if (scenarioData.removedFields?.group) {
        groupField.style.display = 'none';
    } else {
        document.getElementById(`${scenarioId}-group`).value = scenarioData.group || '';
    }

    if (scenarioData.removedFields?.class) {
        classField.style.display = 'none';
    } else {
        document.getElementById(`${scenarioId}-class`).value = scenarioData.class || '';
    }

    // Handle custom details
    if (Object.keys(scenarioData.customDetails || {}).length > 0) {
        const customDetailsContainer = document.getElementById(`${scenarioId}-custom-details`);
        customDetailsContainer.style.display = 'block';
        customDetailsContainer.innerHTML = `<h3>Custom Details for Scenario ${scenarioData.scenarioNumber || 1}</h3>`;

        Object.entries(scenarioData.customDetails).forEach(([key, value]) => {
            const fieldId = `${scenarioId}-custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            customDetailsContainer.insertAdjacentHTML('beforeend', `
                <div class="custom-field" id="${fieldId}">
                    <label for="${fieldId}-value">${escapeHtml(key)}:</label>
                    <input type="text" id="${fieldId}-value" value="${escapeHtml(value)}">
                    <button class="remove-field" onclick="removeCustomDetail('${scenarioId}', '${fieldId}')">x</button>
                </div>
            `);
        });

        customDetailsContainer.insertAdjacentHTML('beforeend', `
            <div id="${scenarioId}-extra-custom-details"></div>
            <button class="add-customdetail" onclick="addCustomDetailField('${scenarioId}')">Add Custom Detail</button>
        `);

        const toggleButton = customDetailsContainer.previousElementSibling;
        toggleButton.textContent = `Remove Custom Details from Scenario ${scenarioData.scenarioNumber || 1}`;
    }

    // Add event listeners
    addListenersToElement(document.getElementById(scenarioId));
}

/**
 * Utility functions
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function addListenersToElement(element) {
    element.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', updatePayload);

        if (input.id === 'routing_key') {
            input.removeEventListener('input', handleRoutingKeyInput);
            input.addEventListener('input', handleRoutingKeyInput);

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                currentRoutingKey = pastedText;
                currentRoutingKeyId = null;
                input.value = maskRoutingKey(pastedText);
                validateRoutingKey(pastedText);
                updatePayload();
            });

            input.addEventListener('drop', (e) => {
                e.preventDefault();
            });

            if (input.value && !input.value.includes('•')) {
                currentRoutingKey = input.value;
                input.value = maskRoutingKey(input.value);
            }
        } else {
            input.addEventListener('input', updatePayload);
        }
    });
}

// Hide dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('routing-key-dropdown');
    const container = e.target.closest('.routing-key-container');
    if (!container && dropdown) {
        dropdown.style.display = 'none';
    }
});

function clearAllScenariosUI() {
    const scenarios = document.querySelectorAll('.scenario');

    if (scenarios.length === 0) {
        showToast('No scenarios to clear!', 'warning');
        return;
    }

    const scenarioCount = scenarios.length;
    const scenarioText = scenarioCount === 1 ? 'scenario' : 'scenarios';

    document.getElementById('scenarios-container').innerHTML = '';
    updateScenarioDisplay(''); // Clear the display
    showToast(`Cleared ${scenarioCount} ${scenarioText} from view!<br>Adding a fresh scenario.`, 'success');

    addScenario();
}

function getCustomDetails(scenarioId) {
    const customDetailsContainer = document.getElementById(`${scenarioId}-custom-details`);
    if (customDetailsContainer.style.display === 'none') {
        return {};
    }

    const details = {};
    customDetailsContainer.querySelectorAll('.custom-field').forEach(field => {
        const label = field.querySelector('label').textContent.replace(':', '').trim();
        const value = field.querySelector('input:last-of-type').value;
        if (label && value) {
            details[label] = value;
        }
    });
    return details;
}

function addScenario() {
    const container = document.getElementById('scenarios-container');
    const scenarioId = `scenario-${Date.now()}`;
    const scenarioCount = container.children.length + 1;

    const scenarioHtml = createScenarioHTML(scenarioId, scenarioCount);
    container.insertAdjacentHTML('beforeend', scenarioHtml);

    updateScenarioFields(scenarioId);
    addListenersToElement(document.getElementById(scenarioId));

    // DON'T update display when adding template scenarios
    // The display should only show when a saved scenario set is loaded

    updatePayload();
}

function createScenarioHTML(scenarioId, scenarioCount) {
    return `
        <div id="${scenarioId}" class="scenario">
            <div class="scenario-header colored-header">
                <span class="scenario-title">Scenario <span class="scenario-number">${scenarioCount}</span>:</span>
                <div class="scenario-type-container">
                    <select id="${scenarioId}-type" class="scenario-type bold-select" onchange="updateScenarioFields('${scenarioId}')">
                        <option value="example01">Example 01</option>
                        <option value="example02">Example 02</option>
                        <option value="example03">Example 03</option>
                        <option value="example04">Example 04</option>
                        <option value="example05">Example 05</option>
                        <option value="example06">Example 06</option>
                        <option value="example07">Example 07</option>
                    </select>
                    <button class="remove-scenario" onclick="removeScenario('${scenarioId}')">Remove</button>
                </div>
            </div>
            <div class="scenario-details">
                <div class="field">
                    <label for="${scenarioId}-summary">Summary:</label>
                    <input type="text" id="${scenarioId}-summary" required>
                </div>
                <div class="field">
                    <label for="${scenarioId}-severity">Severity:</label>
                    <select id="${scenarioId}-severity">
                        <option value="critical">Critical</option>
                        <option value="error">Error</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                    </select>
                </div>
                <div class="field">
                    <label for="${scenarioId}-source">Source:</label>
                    <input type="text" id="${scenarioId}-source" required>
                </div>
                <div id="${scenarioId}-component-field" class="field">
                    <label for="${scenarioId}-component">Component:</label>
                    <input type="text" id="${scenarioId}-component">
                    <button class="remove-field" onclick="removeField('${scenarioId}-component-field')">x</button>
                </div>
                <div id="${scenarioId}-group-field" class="field">
                    <label for="${scenarioId}-group">Group:</label>
                    <input type="text" id="${scenarioId}-group">
                    <button class="remove-field" onclick="removeField('${scenarioId}-group-field')">x</button>
                </div>
                <div id="${scenarioId}-class-field" class="field">
                    <label for="${scenarioId}-class">Class:</label>
                    <input type="text" id="${scenarioId}-class">
                    <button class="remove-field" onclick="removeField('${scenarioId}-class-field')">x</button>
                </div>
                <div id="${scenarioId}-extra-fields"></div>
                <button class="toggle-custom-details" onclick="toggleCustomDetails('${scenarioId}')">Add Custom Details for Scenario ${scenarioCount}</button>
                <div id="${scenarioId}-custom-details" class="custom-details" style="display: none;"></div>
            </div>
        </div>
    `;
}

function removeScenario(scenarioId) {
    document.getElementById(scenarioId).remove();
    updateScenarioNumbers();

    // Clear the display when manually removing scenarios
    updateScenarioDisplay('');

    updatePayload();
}

function updateScenarioNumbers() {
    document.querySelectorAll('.scenario').forEach((scenario, index) => {
        const number = index + 1;
        scenario.querySelector('.scenario-number').textContent = number;

        const scenarioId = scenario.id;
        const toggleButton = scenario.querySelector('.toggle-custom-details');
        const customDetailsContainer = document.getElementById(`${scenarioId}-custom-details`);
        const isHidden = customDetailsContainer.style.display === 'none';
        toggleButton.textContent = isHidden
            ? `Add Custom Details for Scenario ${number}`
            : `Remove Custom Details from Scenario ${number}`;
    });
}

function updateScenarioFields(scenarioId, skipTemplateUpdate = false) {
    const type = document.getElementById(`${scenarioId}-type`).value;
    const template = scenarioTemplates[type];

    if (!skipTemplateUpdate) {
        ['summary', 'severity', 'source', 'component', 'group', 'class'].forEach(field => {
            const el = document.getElementById(`${scenarioId}-${field}`);
            if (el) el.value = template[field];
        });
        updateCustomDetails(scenarioId, template.customDetails);
    }

    updatePayload();
}

function updateCustomDetails(scenarioId, customDetails) {
    const container = document.getElementById(`${scenarioId}-custom-details`);
    const scenarioNumber = document.querySelector(`#${scenarioId} .scenario-number`).textContent;

    container.innerHTML = `<h3>Custom Details for Scenario ${scenarioNumber}</h3>`;

    Object.entries(customDetails).forEach(([key, value]) => {
        const fieldContainerId = `${scenarioId}-${key.toLowerCase().replace(/\s+/g, '-')}-field`;
        const fieldHtml = `
            <div class="custom-field" id="${fieldContainerId}">
                <label>${escapeHtml(key)}:</label>
                <input type="text" value="${escapeHtml(value)}">
                <button class="remove-field" onclick="removeField('${fieldContainerId}')">x</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', fieldHtml);
    });

    container.insertAdjacentHTML('beforeend', `
        <div id="${scenarioId}-extra-custom-details"></div>
        <button class="add-customdetail" onclick="addCustomDetailField('${scenarioId}')">Add Custom Detail</button>
    `);
}

function toggleCustomDetails(scenarioId) {
    const container = document.getElementById(`${scenarioId}-custom-details`);
    const toggleButton = container.previousElementSibling;
    const isHidden = container.style.display === 'none';
    const scenarioNumber = document.querySelector(`#${scenarioId} .scenario-number`).textContent;

    container.style.display = isHidden ? 'block' : 'none';
    toggleButton.textContent = isHidden
        ? `Remove Custom Details from Scenario ${scenarioNumber}`
        : `Add Custom Details for Scenario ${scenarioNumber}`;

    if (isHidden) {
        addListenersToElement(container);
    }

    updatePayload();
}

function addCustomDetailField(scenarioId) {
    const container = document.getElementById(`${scenarioId}-extra-custom-details`);
    const fieldId = `${scenarioId}-custom-${Date.now()}-field`;

    const fieldHtml = `
        <div class="custom-field" id="${fieldId}">
            <label>
                <input type="text" placeholder="Field name" onchange="updateCustomDetailLabel('${fieldId}')">
            </label>
            <input type="text" placeholder="Field value">
            <button class="remove-field" onclick="removeField('${fieldId}')">x</button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', fieldHtml);
    addListenersToElement(document.getElementById(fieldId));
    updatePayload();
}

function updateCustomDetailLabel(fieldId) {
    const field = document.getElementById(fieldId);
    const labelInput = field.querySelector('label input');
    field.querySelector('label').textContent = labelInput.value + ':';
}

function removeCustomDetail(scenarioId, fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.remove();
        updatePayload();
    }
}

function getScenarioData(scenarioId) {
    const summary = document.getElementById(`${scenarioId}-summary`).value.trim();
    const source = document.getElementById(`${scenarioId}-source`).value.trim();
    const scenarioNumber = document.querySelector(`#${scenarioId} .scenario-number`).textContent;

    const missingFields = [];
    if (!summary) missingFields.push('Summary');
    if (!source) missingFields.push('Source');

    if (missingFields.length > 0) {
        throw new Error(`Scenario ${scenarioNumber}: ${missingFields.join(' and ')} ${missingFields.length > 1 ? 'are' : 'is'} mandatory.`);
    }

    const data = {
        summary: summary,
        severity: document.getElementById(`${scenarioId}-severity`).value,
        source: source,
        custom_details: {}
    };

    document.querySelectorAll(`#${scenarioId} .field`).forEach(field => {
        if (field.style.display !== 'none') {
            const label = field.querySelector('label');
            const input = field.querySelector('input:last-of-type, select');
            if (label && input) {
                const key = label.textContent.replace(':', '').trim().toLowerCase();
                if (!['summary', 'severity', 'source'].includes(key)) {
                    data[key] = input.value;
                }
            }
        }
    });

    const customDetailsContainer = document.getElementById(`${scenarioId}-custom-details`);
    if (customDetailsContainer.style.display !== 'none') {
        customDetailsContainer.querySelectorAll('.custom-field').forEach(field => {
            const label = field.querySelector('label');
            const input = field.querySelector('input:last-of-type');
            if (label && input) {
                const key = label.textContent.replace(':', '').trim();
                data.custom_details[key] = input.value;
            }
        });
    }

    return data;
}

function removeField(fieldId) {
    document.getElementById(fieldId).remove();
    updatePayload();
}

function toggleDedupKeyField() {
    const eventAction = document.getElementById('event_action').value;
    const dedupKeyForTrigger = document.getElementById('dedup_key_for_trigger');
    const dedupKeyField = document.getElementById('dedup-key-field');
    const dedupKeyCheckboxLabel = document.getElementById('dedup-key-checkbox-label');

    if (eventAction === 'acknowledge' || eventAction === 'resolve') {
        dedupKeyField.style.display = 'flex';
        dedupKeyCheckboxLabel.style.display = 'none';
    } else if (eventAction === 'trigger') {
        dedupKeyCheckboxLabel.style.display = 'inline-flex';
        dedupKeyField.style.display = dedupKeyForTrigger.checked ? 'flex' : 'none';
    } else {
        dedupKeyField.style.display = 'none';
        dedupKeyCheckboxLabel.style.display = 'none';
    }

    updatePayload();
}

async function sendEvents(button) {
    console.log("Main action started by sendEvents...");
    hidePayload();

    // Disable the button to prevent multiple clicks
    if(button) button.disabled = true;

    try {
        // --- STEP 1: All original validation checks ---
        if (!currentRoutingKey) {
            throw new Error('Routing Key is mandatory.<br>This Key is your Event Orchestration or Service Integration Key.');
        }

        const eventAction = document.getElementById('event_action').value;
        const dedupKey = document.getElementById('dedup_key').value.trim();
        const dedupKeyForTrigger = document.getElementById('dedup_key_for_trigger').checked;
        const scenarios = document.querySelectorAll('.scenario');

        if ((eventAction === 'acknowledge' || eventAction === 'resolve') && !dedupKey) {
            throw new Error('Dedup Key is mandatory for acknowledge and resolve actions.');
        }

        if (eventAction === 'trigger' && dedupKeyForTrigger && !dedupKey) {
            throw new Error('Please add a Dedup Key or unmark the checkbox.');
        }

        if (scenarios.length === 0) {
            throw new Error('At least one scenario is required.');
        }
        
        document.getElementById('error-container').innerHTML = '';
        document.getElementById('result').innerHTML = '';
        
        // --- STEP 2: The primary action (sending events to PagerDuty) ---
        const eventPromises = Array.from(scenarios).map(scenario => {
            const scenarioData = getScenarioData(scenario.id);
            const payload = generateEventPayload(scenarioData);
            return fetch('https://events.pagerduty.com/v2/enqueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        // This 'throw' will be caught by the outer try/catch block
                        throw new Error(`API error: ${text}`);
                    });
                }
                return response.json();
            }).then(data => ({ scenarioData, response: data }));
        });

        // Promise.all will wait for ALL fetch requests to complete. If any ONE fails, it will reject.
        const results = await Promise.all(eventPromises);

        // --- If we reach here, ALL events were sent successfully ---
        displaySuccessResults(results, eventAction);
        
        if (currentRoutingKeyId) {
            storage.updateRoutingKeyUsage(currentRoutingKeyId);
        }

        // --- STEP 3: Increment the Firebase counter (ONLY ON SUCCESS) ---
        console.log("PagerDuty events sent successfully. Incrementing Firebase counter...");
        await window.incrementKrakenCount();

    } catch (error) {
        // --- If any part of the try block fails, we land here ---
        console.error("sendEvents failed:", error.message);
        displayError(error.message); // Your existing error display function
    } finally {
        // --- This runs no matter what, to re-enable the button ---
        if(button) button.disabled = false;
        console.log("sendEvents process complete.");
    }
}

function displayError(errorMessage) {
    let friendlyMessage = errorMessage;

    if (errorMessage.includes('Invalid routing key')) {
        friendlyMessage = 'Invalid routing key. Please check your routing key and try again.';
    } else if (errorMessage.includes('Network')) {
        friendlyMessage = 'Network error. Please check your internet connection and try again.';
    } else if (errorMessage.includes('API error')) {
        friendlyMessage = errorMessage;
    }

    document.getElementById('error-container').innerHTML = `
                <div class="error-message">
                    <strong>Error:</strong> ${friendlyMessage}
                </div>
            `;
    showToast('Failed to send events. Check error details above.', 'error');
}

function displaySuccessResults(results, eventAction) {
    const actionText = eventAction === 'trigger' ? 'triggered' : eventAction + 'd';
    const resultHtml = `
                <h3>Success! Events ${actionText} 🎉</h3>
                <ul>
                    ${results.map((result, index) => `
                        <li>
                            <strong>Scenario ${index + 1}:</strong> ${escapeHtml(result.scenarioData.summary)}
                            <br><small>Dedup Key: ${result.response.dedup_key || 'Auto-generated'}</small>
                        </li>
                    `).join('')}
                </ul>
            `;
    document.getElementById('result').innerHTML = resultHtml;
    showToast(`Successfully ${actionText} ${results.length} event${results.length > 1 ? 's' : ''}!`, 'success');
}

function generateEventPayload(scenarioData) {
    const eventAction = document.getElementById('event_action').value;
    const dedupKey = document.getElementById('dedup_key').value.trim();
    const dedupKeyForTrigger = document.getElementById('dedup_key_for_trigger').checked;
    const client = document.getElementById('client').value;

    const payload = {
        routing_key: currentRoutingKey,
        event_action: eventAction,
        client: client
    };

    if (eventAction === 'trigger') {
        payload.payload = {
            summary: scenarioData.summary,
            severity: scenarioData.severity,
            source: scenarioData.source
        };

        // Add optional fields
        ['component', 'group', 'class'].forEach(field => {
            if (scenarioData[field]) {
                payload.payload[field] = scenarioData[field];
            }
        });

        // Add custom details
        if (Object.keys(scenarioData.custom_details).length > 0) {
            payload.payload.custom_details = scenarioData.custom_details;
        }

        // Add dedup key if specified
        if (dedupKeyForTrigger && dedupKey) {
            payload.dedup_key = dedupKey;
        }
    } else {
        // For acknowledge/resolve actions
        payload.dedup_key = dedupKey;
    }

    return payload;
}

function showPayload() {
    if (!currentRoutingKey) {
        showToast('Please enter a routing key first.', 'warning');
        return;
    }

    const scenarios = document.querySelectorAll('.scenario');
    if (scenarios.length === 0) {
        showToast('Please add at least one scenario.', 'warning');
        return;
    }

    try {
        const payloads = Array.from(scenarios).map(scenario => {
            const scenarioData = getScenarioData(scenario.id);
            return generateEventPayload(scenarioData);
        });

        const payloadPreview = document.getElementById('payload-preview');
        const preElement = payloadPreview.querySelector('.payload-preview');

        preElement.textContent = payloads.map(payload =>
            JSON.stringify(payload, null, 2)
        ).join('\n\n---\n\n');

        payloadPreview.style.display = 'block';
        document.getElementById('showPayloadBtn').style.display = 'none';
        document.getElementById('hidePayloadBtn').style.display = 'inline-block';
    } catch (error) {
        showToast(`Error generating payload: ${error.message}`, 'error');
    }
}

function hidePayload() {
    document.getElementById('payload-preview').style.display = 'none';
    document.getElementById('showPayloadBtn').style.display = 'inline-block';
    document.getElementById('hidePayloadBtn').style.display = 'none';
}

function updatePayload() {
    const payloadPreview = document.getElementById('payload-preview');
    if (payloadPreview.style.display === 'block') {
        showPayload();
    }
}

function downloadShellScript() {
    if (!currentRoutingKey) {
        showToast('Please enter a routing key first.', 'warning');
        return;
    }

    const scenarios = document.querySelectorAll('.scenario');
    if (scenarios.length === 0) {
        showToast('Please add at least one scenario.', 'warning');
        return;
    }

    try {
        const payloads = Array.from(scenarios).map(scenario => {
            const scenarioData = getScenarioData(scenario.id);
            return generateEventPayload(scenarioData);
        });

        let script = '#!/bin/bash\n\n';
        script += '# KrakenDuty - PagerDuty Event Sender Script\n';
        script += '# Generated on: ' + new Date().toISOString() + '\n\n';
        script += 'echo "🦑 KrakenDuty - Sending PagerDuty Events..."\n\n';

        payloads.forEach((payload, index) => {
            script += `echo "Sending event ${index + 1}/${payloads.length}..."\n`;
            script += `curl -X POST https://events.pagerduty.com/v2/enqueue \\\n`;
            script += `  -H "Content-Type: application/json" \\\n`;
            script += `  -d '${JSON.stringify(payload)}'\n\n`;
        });

        script += 'echo "✅ All events sent!"\n';

        const blob = new Blob([script], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'krakenduty-events.sh';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Shell script downloaded successfully!', 'success');
    } catch (error) {
        showToast(`Error generating script: ${error.message}`, 'error');
    }
}

/**
 * Toast notification system
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = getOrCreateToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
                <span>${message}</span>
                <button class="close-toast" onclick="closeToast(this)">&times;</button>
            `;

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            closeToast(toast.querySelector('.close-toast'));
        }
    }, duration);
}

function getOrCreateToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function closeToast(button) {
    const toast = button.parentNode;
    toast.classList.add('hiding');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', function () {
    // Initialize routing key field
    const routingKeyField = document.getElementById('routing_key');
    addListenersToElement(document.body);

    // Add initial scenario
    addScenario();

    // Initialize dedup key field visibility
    toggleDedupKeyField();

    // Show welcome message
    // showToast('Welcome to KrakenDuty! 🦑 Enhanced with persistent storage.', 'info', 4000);
});

// Prevent form submission on Enter key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
    }
});
