// Shipping Cost Prediction App JavaScript

class ShippingCostApp {
    constructor() {
        this.models = {};
        this.countriesData = [];
        this.productsData = [];
        this.currentPredictionMode = 'all';
        this.init();
    }

    init() {
        this.loadModels();
        this.bindEvents();
    }

    bindEvents() {
        // Prediction mode change
        document.getElementById('predictionMode').addEventListener('change', (e) => {
            this.currentPredictionMode = e.target.value;
            this.toggleModelSelection();
            this.updatePredictButton();
            this.hideResults();
        });

        // Individual model selection
        document.getElementById('modelSelect').addEventListener('change', () => {
            this.updatePredictButton();
            this.hideResults();
        });

        // Primary selector changes
        document.getElementById('supplierCountrySelect').addEventListener('change', () => {
            this.updatePredictButton();
            this.hideResults();
        });

        document.getElementById('productSelect').addEventListener('change', () => {
            this.updatePredictButton();
            this.hideResults();
        });

        document.getElementById('riskClassificationSelect').addEventListener('change', () => {
            this.updatePredictButton();
            this.hideResults();
        });

        // Secondary form inputs
        const secondaryInputs = [
            'leadTimeDays', 'supplierReliabilityScore', 'weatherConditionSeverity',
            'routeRiskLevel', 'disruptionLikelihoodScore'
        ];

        secondaryInputs.forEach(inputId => {
            document.getElementById(inputId).addEventListener('input', () => {
                this.updatePredictButton();
                this.hideResults();
            });
        });

        // Load sample data button
        document.getElementById('loadSampleBtn').addEventListener('click', () => {
            this.loadSampleData();
        });

        // Predict button click - handles both modes
        document.getElementById('predictBtn').addEventListener('click', () => {
            if (this.currentPredictionMode === 'all') {
                this.makeAllModelsPrediction();
            } else {
                this.makeIndividualPrediction();
            }
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

    toggleModelSelection() {
        const individualSection = document.getElementById('individualModelSection');
        if (this.currentPredictionMode === 'individual') {
            individualSection.style.display = 'block';
        } else {
            individualSection.style.display = 'none';
        }
    }

    async loadModels() {
        try {
            const response = await fetch('/api/models');
            const models = await response.json();
            
            this.models = models;
            this.extractDropdownData(models);
            this.populateDropdowns();
        } catch (error) {
            console.error('Error loading models:', error);
            this.showError('Failed to load models: ' + error.message);
        }
    }

    extractDropdownData(models) {
        // Extract country and product data from the first model (they should be the same across models)
        const firstModel = Object.values(models)[0];
        if (firstModel && firstModel.input_schema) {
            if (firstModel.input_schema.supplier_country && firstModel.input_schema.supplier_country.options) {
                this.countriesData = firstModel.input_schema.supplier_country.options;
            }
            if (firstModel.input_schema.product_id && firstModel.input_schema.product_id.options) {
                this.productsData = firstModel.input_schema.product_id.options;
            }
        }
    }

    populateDropdowns() {
        // Populate region dropdown
        const countrySelect = document.getElementById('supplierCountrySelect');
        countrySelect.innerHTML = '<option value="">Select Region...</option>';
        this.countriesData.forEach(country => {
            const option = document.createElement('option');
            option.value = country.value;
            option.textContent = country.text;
            countrySelect.appendChild(option);
        });

        // Populate MGC5 dropdown
        const productSelect = document.getElementById('productSelect');
        productSelect.innerHTML = '<option value="">Select MGC5...</option>';
        this.productsData.forEach(product => {
            const option = document.createElement('option');
            option.value = product.value;
            option.textContent = product.text;
            productSelect.appendChild(option);
        });

        // Populate model selection dropdown
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.innerHTML = '<option value="">Choose a model...</option>';
        Object.entries(this.models).forEach(([key, model]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    }

    getFormData() {
        const formData = {};
        
        // Primary selectors
        const supplierCountry = document.getElementById('supplierCountrySelect').value;
        const productId = document.getElementById('productSelect').value;
        const riskClassification = document.getElementById('riskClassificationSelect').value;
        
        if (supplierCountry) formData.supplier_country = parseInt(supplierCountry);
        if (productId) formData.product_id = parseInt(productId);
        if (riskClassification) formData.risk_classification = parseInt(riskClassification);
        
        // Secondary numeric inputs
        const leadTimeDays = document.getElementById('leadTimeDays').value;
        const supplierReliabilityScore = document.getElementById('supplierReliabilityScore').value;
        const weatherConditionSeverity = document.getElementById('weatherConditionSeverity').value;
        const routeRiskLevel = document.getElementById('routeRiskLevel').value;
        const disruptionLikelihoodScore = document.getElementById('disruptionLikelihoodScore').value;
        
        if (leadTimeDays) formData.lead_time_days = parseFloat(leadTimeDays);
        if (supplierReliabilityScore) formData.supplier_reliability_score = parseFloat(supplierReliabilityScore);
        if (weatherConditionSeverity) formData.weather_condition_severity = parseFloat(weatherConditionSeverity);
        if (routeRiskLevel) formData.route_risk_level = parseFloat(routeRiskLevel);
        if (disruptionLikelihoodScore) formData.disruption_likelihood_score = parseFloat(disruptionLikelihoodScore);
        
        return formData;
    }

    validateFormData() {
        const formData = this.getFormData();
        const errors = [];
        
        // Check required primary selectors
        if (!formData.supplier_country) errors.push('Region is required');
        if (!formData.product_id) errors.push('MGC5 is required');
        if (!formData.risk_classification) errors.push('Risk Classification is required');
        
        // Check required secondary inputs
        if (!formData.lead_time_days) errors.push('Lead Time Days is required');
        if (!formData.supplier_reliability_score) errors.push('Supplier Reliability Score is required');
        if (!formData.weather_condition_severity) errors.push('Weather Condition Severity is required');
        if (!formData.route_risk_level) errors.push('Route Risk Level is required');
        if (!formData.disruption_likelihood_score) errors.push('Disruption Likelihood Score is required');
        
        // Validate risk classification range
        if (formData.risk_classification && (formData.risk_classification < 2 || formData.risk_classification > 4)) {
            errors.push('Risk Classification must be between 2-4');
        }
        
        return { valid: errors.length === 0, errors, data: formData };
    }

    async makeAllModelsPrediction() {
        const validation = this.validateFormData();
        if (!validation.valid) {
            this.showError('Form validation errors: ' + validation.errors.join(', '));
            return;
        }

        const inputData = validation.data;
        this.showLoading(true);
        this.hideResults();
        this.hideError();

        try {
            const response = await fetch('/api/predict/all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: inputData
                })
            });

            const result = await response.json();
            this.showLoading(false);

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'All models prediction failed');
            }

            this.displayAllModelsResults(result, inputData);
        } catch (error) {
            this.showLoading(false);
            this.showError('Prediction failed: ' + error.message);
        }
    }

    async makeIndividualPrediction() {
        const validation = this.validateFormData();
        if (!validation.valid) {
            this.showError('Form validation errors: ' + validation.errors.join(', '));
            return;
        }

        const selectedModel = document.getElementById('modelSelect').value;
        if (!selectedModel) {
            this.showError('Please select a model for individual prediction');
            return;
        }

        const inputData = validation.data;
        this.showLoading(true);
        this.hideResults();
        this.hideError();

        try {
            const result = await this.callModel(selectedModel, inputData);
            this.showLoading(false);
            this.displayIndividualResult(result, selectedModel, inputData);
        } catch (error) {
            this.showLoading(false);
            this.showError('Prediction failed: ' + error.message);
        }
    }

    async callModel(modelKey, inputData) {
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
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Model prediction failed');
        }
        
        return result;
    }

    displayAllModelsResults(allResults, inputData) {
        // Show all models results section
        document.getElementById('allModelsResults').classList.remove('d-none');
        document.getElementById('individualResults').classList.add('d-none');
        document.getElementById('resultsTitle').textContent = 'All Models Comparison Results';

        // Map results to display containers
        const modelMapping = {
            'shipping_cost_90th_percentile': 'percentile90Results',
            'shipping_cost_10th_percentile': 'xgboostResults', // Note: container ID kept as 'xgboostResults' for consistency
            'shipping_cost_median': 'medianResults'
        };

        // Display results for each model
        Object.entries(allResults.results).forEach(([modelKey, result]) => {
            const containerId = modelMapping[modelKey];
            if (containerId) {
                const container = document.getElementById(containerId);
                container.innerHTML = this.formatModelResult(result, this.models[modelKey].name);
            }
        });

        // Display errors if any
        if (allResults.errors && Object.keys(allResults.errors).length > 0) {
            Object.entries(allResults.errors).forEach(([modelKey, error]) => {
                const containerId = modelMapping[modelKey];
                if (containerId) {
                    const container = document.getElementById(containerId);
                    container.innerHTML = `<div class="alert alert-danger">
                        <strong>Error:</strong> ${error.error || 'Prediction failed'}
                    </div>`;
                }
            });
        }

        // Create comparison summary
        const summaryDiv = document.getElementById('comparisonSummary');
        summaryDiv.innerHTML = this.createAllModelsComparisonSummary(allResults, inputData);

        // Show results section
        document.getElementById('resultsSection').classList.remove('d-none');
        
        // Scroll to results
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
    }

    displayIndividualResult(result, modelKey, inputData) {
        // Show individual result section
        document.getElementById('individualResults').classList.remove('d-none');
        document.getElementById('allModelsResults').classList.add('d-none');
        document.getElementById('resultsTitle').textContent = 'Individual Model Result';
        
        // Update model name in header
        document.getElementById('selectedModelName').textContent = this.models[modelKey].name;

        // Display result
        const container = document.getElementById('singleModelResults');
        container.innerHTML = this.formatModelResult(result, this.models[modelKey].name);

        // Show results section
        document.getElementById('resultsSection').classList.remove('d-none');
        
        // Scroll to results
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
    }

    extractPredictionValue(result) {
        // Extract the numeric prediction value from the result
        if (result.prediction && result.prediction.predictions && Array.isArray(result.prediction.predictions)) {
            return result.prediction.predictions[0];
        }
        return 0;
    }

    formatModelResult(result, type = '') {
        const predictionValue = this.extractPredictionValue(result);
        const formattedValue = typeof predictionValue === 'number' ? predictionValue.toFixed(2) : predictionValue;
        
        return `
            <div class="mb-3">
                <div class="text-center mb-3">
                    <h2 class="display-6 fw-bold text-primary">$${formattedValue}</h2>
                    <small class="text-muted">${type} Cost</small>
                </div>
                <div class="bg-light p-2 rounded">
                    <small class="text-muted">
                        <strong>Model:</strong> ${result.model}<br>
                        ${result.calculated ? '<em></em>' : '<em>API prediction</em>'}<br>
                        <strong>Timestamp:</strong> ${new Date().toLocaleString()}
                    </small>
                </div>
                <details class="mt-2">
                    <summary class="btn btn-outline-secondary btn-sm">View Raw Data</summary>
                    <pre class="mt-2 bg-light p-2 rounded small">${JSON.stringify(result.prediction, null, 2)}</pre>
                </details>
            </div>
        `;
    }

    createAllModelsComparisonSummary(allResults, inputData) {
        const regionName = this.countriesData.find(c => c.value == inputData.supplier_country)?.text || 'Unknown';
        const mgc5Name = this.productsData.find(p => p.value == inputData.product_id)?.text || 'Unknown';
        
        // Extract values from successful results
        const values = {};
        Object.entries(allResults.results).forEach(([modelKey, result]) => {
            values[modelKey] = this.extractPredictionValue(result);
        });

        const valuesArray = Object.values(values);
        const minValue = Math.min(...valuesArray);
        const maxValue = Math.max(...valuesArray);
        const avgValue = valuesArray.reduce((sum, val) => sum + val, 0) / valuesArray.length;
        
        return `
            <div class="row">
                <div class="col-md-6">
                    <h6>Input Summary</h6>
                    <ul class="list-unstyled">
                        <li><strong>Region:</strong> ${regionName}</li>
                        <li><strong>MGC5:</strong> ${mgc5Name}</li>
                        <li><strong>Risk Level:</strong> ${inputData.risk_classification}</li>
                        <li><strong>Lead Time:</strong> ${inputData.lead_time_days} days</li>
                        <li><strong>Reliability:</strong> ${inputData.supplier_reliability_score}%</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <h6>Model Statistics</h6>
                    <div class="alert alert-info">
                        <p><strong>Models Called:</strong> ${allResults.total_models}</p>
                        <p><strong>Successful:</strong> ${allResults.successful_predictions}</p>
                        <p><strong>Failed:</strong> ${allResults.failed_predictions}</p>
                        ${valuesArray.length > 0 ? `
                        <hr>
                        <p><strong>Lowest Cost:</strong> $${minValue.toFixed(2)} <span class="badge bg-success">Best</span></p>
                        <p><strong>Average Cost:</strong> $${avgValue.toFixed(2)} <span class="badge bg-primary">Average</span></p>
                        <p><strong>Highest Cost:</strong> $${maxValue.toFixed(2)} <span class="badge bg-warning">Highest</span></p>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    updatePredictButton() {
        const predictBtn = document.getElementById('predictBtn');
        const validation = this.validateFormData();
        
        // For individual mode, also check if a model is selected
        let isValid = validation.valid;
        if (this.currentPredictionMode === 'individual') {
            const selectedModel = document.getElementById('modelSelect').value;
            isValid = isValid && selectedModel !== '';
        }
        
        predictBtn.disabled = !isValid;
        
        // Update button text based on mode
        const buttonText = this.currentPredictionMode === 'all' 
            ? '<i class="fas fa-calculator me-2"></i>Get All Model Predictions'
            : '<i class="fas fa-robot me-2"></i>Get Individual Prediction';
        predictBtn.innerHTML = buttonText;
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

    loadSampleData() {
        // Load sample data into form fields
        const firstModel = Object.values(this.models)[0];
        
        if (firstModel && firstModel.sample_input) {
            const sample = firstModel.sample_input;
            
            // Set primary selectors
            if (sample.supplier_country) {
                const countrySelect = document.getElementById('supplierCountrySelect');
                if (countrySelect) countrySelect.value = sample.supplier_country;
            }
            if (sample.product_id) {
                const productSelect = document.getElementById('productSelect');
                if (productSelect) productSelect.value = sample.product_id;
            }
            if (sample.risk_classification) {
                const riskSelect = document.getElementById('riskClassificationSelect');
                if (riskSelect) riskSelect.value = sample.risk_classification;
            }
            
            // Set secondary inputs
            if (sample.lead_time_days) {
                const leadTimeInput = document.getElementById('leadTimeDays');
                if (leadTimeInput) leadTimeInput.value = sample.lead_time_days;
            }
            if (sample.supplier_reliability_score) {
                const reliabilityInput = document.getElementById('supplierReliabilityScore');
                if (reliabilityInput) reliabilityInput.value = sample.supplier_reliability_score;
            }
            if (sample.weather_condition_severity) {
                const weatherInput = document.getElementById('weatherConditionSeverity');
                if (weatherInput) weatherInput.value = sample.weather_condition_severity;
            }
            if (sample.route_risk_level) {
                const routeInput = document.getElementById('routeRiskLevel');
                if (routeInput) routeInput.value = sample.route_risk_level;
            }
            if (sample.disruption_likelihood_score) {
                const disruptionInput = document.getElementById('disruptionLikelihoodScore');
                if (disruptionInput) disruptionInput.value = sample.disruption_likelihood_score;
            }
            
            // Trigger change events to update button state
            this.updatePredictButton();
        }
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
        document.getElementById('allModelsResults').classList.add('d-none');
        document.getElementById('individualResults').classList.add('d-none');
    }

    hideError() {
        document.getElementById('errorSection').classList.add('d-none');
    }

    clearForm() {
        // Reset prediction mode to all
        document.getElementById('predictionMode').value = 'all';
        this.currentPredictionMode = 'all';
        this.toggleModelSelection();
        
        // Clear model selection
        document.getElementById('modelSelect').value = '';
        
        // Clear primary selectors
        document.getElementById('supplierCountrySelect').value = '';
        document.getElementById('productSelect').value = '';
        document.getElementById('riskClassificationSelect').value = '';
        
        // Clear secondary inputs
        document.getElementById('leadTimeDays').value = '';
        document.getElementById('supplierReliabilityScore').value = '';
        document.getElementById('weatherConditionSeverity').value = '';
        document.getElementById('routeRiskLevel').value = '';
        document.getElementById('disruptionLikelihoodScore').value = '';
        
        this.hideResults();
        this.hideError();
        this.updatePredictButton();
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ShippingCostApp();
});