// Databricks Model Serving App JavaScript

class DatabricksModelApp {
    constructor() {
        this.models = {};
        this.currentModel = null;
        this.currentInputMode = 'json'; // 'json' or 'form'
        this.init();
    }

    init() {
        this.loadModels();
        this.bindEvents();
    }

    bindEvents() {
        // Model selection change
        document.getElementById('modelSelect').addEventListener('change', (e) => {
            this.onModelChange(e.target.value);
        });

        // Input mode buttons
        document.getElementById('useFormBtn').addEventListener('click', () => {
            this.switchInputMode('form');
        });

        document.getElementById('useJsonBtn').addEventListener('click', () => {
            this.switchInputMode('json');
        });

        document.getElementById('loadSampleBtn').addEventListener('click', () => {
            this.loadSampleData();
        });

        // Input data change
        document.getElementById('inputData').addEventListener('input', () => {
            this.updatePredictButton();
            this.hideResults();
        });

        // Predict button click
        document.getElementById('predictBtn').addEventListener('click', () => {
            this.makePrediction();
        });

        // Clear button click
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearForm();
        });

        // Health check button click
        document.getElementById('healthCheck').addEventListener('click', () => {
            this.performHealthCheck();
        });
    }

    async loadModels() {
        try {
            const response = await fetch('/api/models');
            const models = await response.json();
            
            this.models = models;
            this.populateModelSelect(models);
        } catch (error) {
            console.error('Error loading models:', error);
            this.showError('Failed to load models: ' + error.message);
        }
    }

    populateModelSelect(models) {
        const select = document.getElementById('modelSelect');
        select.innerHTML = '<option value="">Select a model...</option>';
        
        Object.entries(models).forEach(([key, model]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = model.name;
            select.appendChild(option);
        });
    }

    onModelChange(modelKey) {
        this.currentModel = modelKey ? this.models[modelKey] : null;
        
        if (this.currentModel) {
            this.showModelInfo();
            this.createDynamicForm();
            this.loadSampleData();
        } else {
            this.hideModelInfo();
        }
        
        this.updatePredictButton();
        this.hideResults();
        this.hideError();
    }

    showModelInfo() {
        const modelInfo = document.getElementById('modelInfo');
        const modelDescription = document.getElementById('modelDescription');
        
        modelDescription.textContent = this.currentModel.description || 'No description available';
        modelInfo.classList.remove('d-none');
    }

    hideModelInfo() {
        document.getElementById('modelInfo').classList.add('d-none');
        document.getElementById('formInputSection').classList.add('d-none');
    }

    switchInputMode(mode) {
        this.currentInputMode = mode;
        
        const formSection = document.getElementById('formInputSection');
        const jsonSection = document.getElementById('jsonInputSection');
        const useFormBtn = document.getElementById('useFormBtn');
        const useJsonBtn = document.getElementById('useJsonBtn');
        
        if (mode === 'form') {
            formSection.classList.remove('d-none');
            jsonSection.classList.add('d-none');
            useFormBtn.className = 'btn btn-sm btn-primary';
            useJsonBtn.className = 'btn btn-sm btn-outline-primary';
        } else {
            formSection.classList.add('d-none');
            jsonSection.classList.remove('d-none');
            useFormBtn.className = 'btn btn-sm btn-outline-primary';
            useJsonBtn.className = 'btn btn-sm btn-primary';
        }
        
        this.updatePredictButton();
    }

    createDynamicForm() {
        const dynamicForm = document.getElementById('dynamicForm');
        
        if (!this.currentModel || !this.currentModel.input_schema) {
            dynamicForm.innerHTML = '<p class="text-muted">No form available for this model</p>';
            return;
        }
        
        const schema = this.currentModel.input_schema;
        let formHtml = '<div class="row">';
        
        Object.entries(schema).forEach(([fieldName, fieldInfo], index) => {
            const colClass = index % 2 === 0 ? 'col-md-6' : 'col-md-6';
            
            formHtml += `
                <div class="${colClass} mb-3">
                    <label for="field_${fieldName}" class="form-label">
                        ${fieldName}
                        <small class="text-muted">(${fieldInfo.type})</small>
                    </label>
                    <input 
                        type="number" 
                        class="form-control" 
                        id="field_${fieldName}" 
                        name="${fieldName}"
                        placeholder="${fieldInfo.description}"
                        min="${fieldInfo.min || ''}"
                        max="${fieldInfo.max || ''}"
                        step="${fieldInfo.type === 'double' ? '0.01' : '1'}"
                        data-field-name="${fieldName}"
                    >
                    <div class="form-text">${fieldInfo.description}</div>
                </div>
            `;
        });
        
        formHtml += '</div>';
        dynamicForm.innerHTML = formHtml;
        
        // Add event listeners to form fields
        dynamicForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                this.updatePredictButton();
                this.hideResults();
            });
        });
    }

    getFormData() {
        const formData = {};
        const dynamicForm = document.getElementById('dynamicForm');
        
        dynamicForm.querySelectorAll('input').forEach(input => {
            const fieldName = input.dataset.fieldName;
            const value = input.value.trim();
            
            if (value !== '') {
                const fieldInfo = this.currentModel.input_schema[fieldName];
                if (fieldInfo.type === 'double') {
                    formData[fieldName] = parseFloat(value);
                } else {
                    formData[fieldName] = parseInt(value);
                }
            }
        });
        
        return formData;
    }

    validateFormData() {
        if (!this.currentModel || !this.currentModel.input_schema) {
            return { valid: false, errors: ['No model schema available'] };
        }
        
        const formData = this.getFormData();
        const errors = [];
        
        Object.entries(this.currentModel.input_schema).forEach(([fieldName, fieldInfo]) => {
            if (!(fieldName in formData)) {
                errors.push(`${fieldName} is required`);
                return;
            }
            
            const value = formData[fieldName];
            if (fieldInfo.min !== undefined && value < fieldInfo.min) {
                errors.push(`${fieldName} must be at least ${fieldInfo.min}`);
            }
            if (fieldInfo.max !== undefined && value > fieldInfo.max) {
                errors.push(`${fieldName} must be at most ${fieldInfo.max}`);
            }
        });
        
        return { valid: errors.length === 0, errors, data: formData };
    }

    updatePredictButton() {
        const modelSelected = document.getElementById('modelSelect').value;
        const predictBtn = document.getElementById('predictBtn');
        
        let hasValidInput = false;
        
        if (this.currentInputMode === 'json') {
            const inputData = document.getElementById('inputData').value.trim();
            hasValidInput = inputData !== '';
        } else if (this.currentInputMode === 'form') {
            const validation = this.validateFormData();
            hasValidInput = validation.valid;
        }
        
        predictBtn.disabled = !modelSelected || !hasValidInput;
    }

    async makePrediction() {
        const modelKey = document.getElementById('modelSelect').value;
        
        if (!modelKey) {
            this.showError('Please select a model');
            return;
        }

        let inputData;
        
        if (this.currentInputMode === 'form') {
            const validation = this.validateFormData();
            if (!validation.valid) {
                this.showError('Form validation errors: ' + validation.errors.join(', '));
                return;
            }
            inputData = validation.data;
        } else {
            const inputDataText = document.getElementById('inputData').value.trim();
            if (!inputDataText) {
                this.showError('Please enter input data');
                return;
            }

            // Validate JSON
            try {
                inputData = JSON.parse(inputDataText);
            } catch (error) {
                this.showError('Invalid JSON format in input data: ' + error.message);
                return;
            }
        }

        this.showLoading(true);
        this.hideResults();
        this.hideError();

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelKey,
                    input: inputData
                })
            });

            const result = await response.json();
            this.showLoading(false);

            if (response.ok && result.success) {
                this.showResults(result);
            } else {
                this.showError(result.error || 'Prediction failed');
            }
        } catch (error) {
            this.showLoading(false);
            this.showError('Network error: ' + error.message);
        }
    }

    async performHealthCheck() {
        const button = document.getElementById('healthCheck');
        const originalText = button.innerHTML;
        
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Checking...';
        button.disabled = true;

        try {
            const response = await fetch('/api/health');
            const result = await response.json();
            
            if (response.ok) {
                button.innerHTML = '<i class="fas fa-check me-2"></i>Healthy';
                button.className = 'btn btn-success';
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.className = 'btn btn-outline-info';
                    button.disabled = false;
                }, 2000);
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            button.innerHTML = '<i class="fas fa-times me-2"></i>Error';
            button.className = 'btn btn-danger';
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.className = 'btn btn-outline-info';
                button.disabled = false;
            }, 2000);
        }
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (show) {
            loadingIndicator.classList.remove('d-none');
        } else {
            loadingIndicator.classList.add('d-none');
        }
    }

    showResults(result) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsDiv = document.getElementById('results');
        
        // Format the results nicely
        const formattedResult = {
            model: result.model,
            timestamp: new Date().toISOString(),
            prediction: result.prediction
        };
        
        resultsDiv.innerHTML = `<pre>${JSON.stringify(formattedResult, null, 2)}</pre>`;
        resultsSection.classList.remove('d-none');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    showError(message) {
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorSection.classList.remove('d-none');
        
        // Scroll to error
        errorSection.scrollIntoView({ behavior: 'smooth' });
    }

    hideResults() {
        document.getElementById('resultsSection').classList.add('d-none');
    }

    hideError() {
        document.getElementById('errorSection').classList.add('d-none');
    }

    clearForm() {
        document.getElementById('inputData').value = '';
        document.getElementById('modelSelect').value = '';
        
        // Clear dynamic form
        const dynamicForm = document.getElementById('dynamicForm');
        dynamicForm.querySelectorAll('input').forEach(input => {
            input.value = '';
        });
        
        this.currentModel = null;
        this.hideResults();
        this.hideError();
        this.hideModelInfo();
        this.updatePredictButton();
    }

    loadSampleData() {
        if (!this.currentModel || !this.currentModel.sample_input) {
            return;
        }

        const sampleData = this.currentModel.sample_input;

        if (this.currentInputMode === 'json') {
            const inputData = document.getElementById('inputData');
            inputData.value = JSON.stringify(sampleData, null, 2);
        } else if (this.currentInputMode === 'form') {
            const dynamicForm = document.getElementById('dynamicForm');
            Object.entries(sampleData).forEach(([fieldName, value]) => {
                const input = dynamicForm.querySelector(`input[data-field-name="${fieldName}"]`);
                if (input) {
                    input.value = value;
                }
            });
        }

        this.updatePredictButton();
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DatabricksModelApp();
});