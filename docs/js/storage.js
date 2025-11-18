// Enhanced Data Management System
// Enhanced Data Management System with duplicate name prevention
class KrakenDutyStorage {
    constructor() {
        this.storageKey = 'krakenduty_data';
        this.init();
    }

    init() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                this.resetStorage();
            }
        } catch (error) {
            console.error('Storage initialization failed:', error);
            this.resetStorage();
        }
    }

    resetStorage() {
        const defaultData = {
            routingKeys: {},
            scenarioSets: {},
            version: '1.2'
        };
        localStorage.setItem(this.storageKey, JSON.stringify(defaultData));
    }

    getData() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || {};
        } catch (error) {
            console.error('Failed to parse storage data:', error);
            this.resetStorage();
            return this.getData();
        }
    }

    saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            return false;
        }
    }

    // Enhanced Routing Key Management with duplicate prevention
    isRoutingKeyNameExists(name, excludeId = null) {
        const data = this.getData();
        const normalizedName = name.trim().toLowerCase();
        return Object.values(data.routingKeys || {}).some(key =>
            key.name.toLowerCase() === normalizedName && key.id !== excludeId
        );
    }

    saveRoutingKey(name, key) {
        const trimmedName = name.trim();
        if (this.isRoutingKeyNameExists(trimmedName)) {
            throw new Error(`A routing key with the name "${trimmedName}" already exists. Please choose a different name.`);
        }

        const data = this.getData();
        const id = this.generateId();
        data.routingKeys[id] = {
            id,
            name: trimmedName,
            key: key,
            created: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };
        return this.saveData(data) ? id : null;
    }

    updateRoutingKey(id, name, key) {
        const trimmedName = name.trim();
        if (this.isRoutingKeyNameExists(trimmedName, id)) {
            throw new Error(`A routing key with the name "${trimmedName}" already exists. Please choose a different name.`);
        }

        const data = this.getData();
        if (data.routingKeys[id]) {
            data.routingKeys[id].name = trimmedName;
            data.routingKeys[id].key = key;
            data.routingKeys[id].lastUsed = new Date().toISOString();
            return this.saveData(data);
        }
        return false;
    }

    getRoutingKeys() {
        const data = this.getData();
        return Object.values(data.routingKeys || {}).sort((a, b) =>
            new Date(b.lastUsed) - new Date(a.lastUsed)
        );
    }

    getRoutingKey(id) {
        const data = this.getData();
        return data.routingKeys[id] || null;
    }

    updateRoutingKeyUsage(id) {
        const data = this.getData();
        if (data.routingKeys[id]) {
            data.routingKeys[id].lastUsed = new Date().toISOString();
            this.saveData(data);
        }
    }

    deleteRoutingKey(id) {
        const data = this.getData();
        delete data.routingKeys[id];
        return this.saveData(data);
    }

    // Enhanced Scenario Set Management with duplicate prevention
    isScenarioSetNameExists(name, excludeId = null) {
        const data = this.getData();
        const normalizedName = name.trim().toLowerCase();
        return Object.values(data.scenarioSets || {}).some(set =>
            set.name.toLowerCase() === normalizedName && set.id !== excludeId
        );
    }

    saveScenarioSet(name, scenarios, routingKeyId = null) {
        const trimmedName = name.trim();
        if (this.isScenarioSetNameExists(trimmedName)) {
            throw new Error(`A scenario set with the name "${trimmedName}" already exists. Please choose a different name.`);
        }

        const data = this.getData();
        const id = this.generateId();
        data.scenarioSets[id] = {
            id,
            name: trimmedName,
            scenarios,
            routingKeyId,
            created: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };
        return this.saveData(data) ? id : null;
    }

    updateScenarioSet(id, name, scenarios, routingKeyId = null) {
        const trimmedName = name.trim();
        if (this.isScenarioSetNameExists(trimmedName, id)) {
            throw new Error(`A scenario set with the name "${trimmedName}" already exists. Please choose a different name.`);
        }

        const data = this.getData();
        if (data.scenarioSets[id]) {
            data.scenarioSets[id].name = trimmedName;
            data.scenarioSets[id].scenarios = scenarios;
            data.scenarioSets[id].routingKeyId = routingKeyId;
            data.scenarioSets[id].lastUsed = new Date().toISOString();
            return this.saveData(data);
        }
        return false;
    }

    getScenarioSets() {
        const data = this.getData();
        return Object.values(data.scenarioSets || {}).sort((a, b) =>
            new Date(b.lastUsed) - new Date(a.lastUsed)
        );
    }

    getScenarioSet(id) {
        const data = this.getData();
        return data.scenarioSets[id] || null;
    }

    updateScenarioSetUsage(id) {
        const data = this.getData();
        if (data.scenarioSets[id]) {
            data.scenarioSets[id].lastUsed = new Date().toISOString();
            this.saveData(data);
        }
    }

    deleteScenarioSet(id) {
        const data = this.getData();
        delete data.scenarioSets[id];
        return this.saveData(data);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Utility method to suggest alternative names
    suggestAlternativeName(baseName, type = 'routingKey') {
        const checkMethod = type === 'routingKey' ? 'isRoutingKeyNameExists' : 'isScenarioSetNameExists';
        let counter = 1;
        let suggestedName = `${baseName} (${counter})`;

        while (this[checkMethod](suggestedName)) {
            counter++;
            suggestedName = `${baseName} (${counter})`;
        }

        return suggestedName;
    }
}
