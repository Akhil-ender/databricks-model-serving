// Shipping Cost Prediction App JavaScript

class ShippingCostApp {
    constructor() {
        this.models = {};
        this.countriesData = [];
        this.productsData = [];
        this.currentPredictionMode = 'individual';
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
            this.updatePartNumber(); // This will automatically trigger updateFeatureAvailability()
            this.updatePredictButton();
            this.hideResults();
        });

        document.getElementById('productSelect').addEventListener('change', () => {
            this.updatePartNumber(); // This will automatically trigger updateFeatureAvailability()
            this.updatePredictButton();
            this.hideResults();
        });

        document.getElementById('riskClassificationSelect').addEventListener('change', () => {
            this.updatePredictButton();
            this.hideResults();
        });

        // Part number direct input
        document.getElementById('partNumberDisplay').addEventListener('input', (e) => {
            const partNumber = e.target.value.trim();
            if (partNumber && partNumber.length > 3) { // Only trigger after meaningful input
                this.hideError(); // Hide any previous error messages
                this.handleDirectPartNumberInput(partNumber);
            } else if (!partNumber) {
                // Clear fields if part number is cleared
                this.hideError(); // Hide any error messages
                this.resetFeatureVisibility();
                this.updatePredictButton(); // Re-enable button if other conditions are met
            }
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
            // Set R1 as default
            if (country.text === 'R1') {
                option.selected = true;
            }
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

        // Populate model selection dropdown with median as default
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.innerHTML = '<option value="">Choose a model...</option>';
        Object.entries(this.models).forEach(([key, model]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = model.name;
            // Set median model as default
            if (key === 'Model-1') {
                option.selected = true;
            }
            modelSelect.appendChild(option);
        });
        
        // Update part number on initial load if defaults are set
        // Feature availability will be automatically triggered when part number is populated
        this.updatePartNumber();
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
        
        // Secondary numeric inputs - provide defaults for disabled fields
        const leadTimeDays = document.getElementById('leadTimeDays').value;
        const supplierReliabilityScore = document.getElementById('supplierReliabilityScore');
        const weatherConditionSeverity = document.getElementById('weatherConditionSeverity');
        const routeRiskLevel = document.getElementById('routeRiskLevel');
        const disruptionLikelihoodScore = document.getElementById('disruptionLikelihoodScore');
        
        // Always include lead time
        if (leadTimeDays) {
            formData.lead_time_days = parseFloat(leadTimeDays);
        }
        
        // Handle supplier reliability - use value if enabled, default if disabled
        if (!supplierReliabilityScore.disabled && supplierReliabilityScore.value) {
            formData.supplier_reliability_score = parseFloat(supplierReliabilityScore.value);
        } else if (supplierReliabilityScore.disabled) {
            formData.supplier_reliability_score = 75.0; // Default for disabled state
        }
        
        // Handle weather condition - use value if enabled, default if disabled
        if (!weatherConditionSeverity.disabled && weatherConditionSeverity.value) {
            formData.weather_condition_severity = parseFloat(weatherConditionSeverity.value);
        } else if (weatherConditionSeverity.disabled) {
            formData.weather_condition_severity = 2.0; // Default for disabled state
        }
        
        // Handle route risk - use value if enabled, default if disabled
        if (!routeRiskLevel.disabled && routeRiskLevel.value) {
            formData.route_risk_level = parseFloat(routeRiskLevel.value);
        } else if (routeRiskLevel.disabled) {
            formData.route_risk_level = 1.5; // Default for disabled state
        }
        
        // Handle disruption likelihood - use value if enabled, default if disabled
        if (!disruptionLikelihoodScore.disabled && disruptionLikelihoodScore.value) {
            formData.disruption_likelihood_score = parseFloat(disruptionLikelihoodScore.value);
        } else if (disruptionLikelihoodScore.disabled) {
            formData.disruption_likelihood_score = 10.0; // Default for disabled state
        }
        
        return formData;
    }

    validateFormData() {
        const formData = this.getFormData();
        const errors = [];
        
        // Check required primary selectors
        if (!formData.supplier_country) errors.push('Region is required');
        if (!formData.product_id) errors.push('MGC5 is required');
        if (!formData.risk_classification) errors.push('Risk Classification is required');
        
        // Check required secondary inputs - only validate enabled fields
        if (!formData.lead_time_days) errors.push('Lead Time Days is required');
        
        // Only validate enabled fields for user input
        const supplierReliabilityScore = document.getElementById('supplierReliabilityScore');
        if (!supplierReliabilityScore.disabled && !supplierReliabilityScore.value) {
            errors.push('Supplier Reliability Score is required');
        }
        
        const weatherConditionSeverity = document.getElementById('weatherConditionSeverity');
        if (!weatherConditionSeverity.disabled && !weatherConditionSeverity.value) {
            errors.push('Weather Condition Severity is required');
        }
        
        const routeRiskLevel = document.getElementById('routeRiskLevel');
        if (!routeRiskLevel.disabled && !routeRiskLevel.value) {
            errors.push('Route Risk Level is required');
        }
        
        const disruptionLikelihoodScore = document.getElementById('disruptionLikelihoodScore');
        if (!disruptionLikelihoodScore.disabled && !disruptionLikelihoodScore.value) {
            errors.push('Disruption Likelihood Score is required');
        }
        
        // Validate risk classification range
        if (formData.risk_classification && (formData.risk_classification < 1 || formData.risk_classification > 4)) {
            errors.push('Risk Classification must be between 1-4');
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

        // Map results to display containers for 12 models
        const modelMapping = {
            'Model-1': 'Model1Results',
            'Model-2': 'Model2Results',
            'Model-3': 'Model3Results',
            'Model-4': 'Model4Results',
            'Model-5': 'Model5Results',
            'Model-6': 'Model6Results',
            'Model-7': 'Model7Results',
            'Model-8': 'Model8Results',
            'Model-9': 'Model9Results',
            'Model-10': 'Model10Results',
            'Model-11': 'Model11Results',
            'Model-12': 'Model12Results'
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
        // Reset prediction mode to individual (Model-1 default)
        document.getElementById('predictionMode').value = 'individual';
        this.currentPredictionMode = 'individual';
        this.toggleModelSelection();
        
        // Reset model selection to Model-1 default
        document.getElementById('modelSelect').value = 'Model-1';
        
        // Reset primary selectors to defaults (R1 for region, clear others)
        document.getElementById('supplierCountrySelect').value = '1'; // R1
        document.getElementById('productSelect').value = '';
        document.getElementById('riskClassificationSelect').value = '';
        
        // Clear secondary inputs
        document.getElementById('leadTimeDays').value = '';
        document.getElementById('supplierReliabilityScore').value = '';
        document.getElementById('weatherConditionSeverity').value = '';
        document.getElementById('routeRiskLevel').value = '';
        document.getElementById('disruptionLikelihoodScore').value = '';
        
        // Update part number based on new defaults
        // Feature availability will be automatically triggered
        this.updatePartNumber();
        
        this.hideResults();
        this.hideError();
        this.updatePredictButton();
    }

    async updatePartNumber() {
        const regionSelect = document.getElementById('supplierCountrySelect');
        const mgc5Select = document.getElementById('productSelect');
        const partNumberInput = document.getElementById('partNumberDisplay');
        
        const regionValue = regionSelect.value;
        const mgc5Value = mgc5Select.value;
        
        // Clear part number if either selection is empty
        if (!regionValue || !mgc5Value) {
            partNumberInput.value = '';
            return;
        }
        
        // Get region text and MGC5 text for lookup
        const regionText = regionSelect.options[regionSelect.selectedIndex].text;
        const mgc5Text = mgc5Select.options[mgc5Select.selectedIndex].text;
        
        try {
            const response = await fetch(`/api/part-number?mgc5=${encodeURIComponent(mgc5Text)}&region=${encodeURIComponent(regionText)}`);
            const result = await response.json();
            
            if (response.ok && result.part_number) {
                partNumberInput.value = result.part_number;
                // Trigger feature availability and populate related fields based on the part number
                this.populateFieldsFromPartNumber(result.part_number);
            } else {
                partNumberInput.value = 'Not found';
                // Show message when region/MGC5 combination is not supported
                this.showError('No price prediction model currently available for this Region/MGC5 combination. Please try a different combination.');
                this.resetFeatureVisibility();
            }
        } catch (error) {
            console.error('Error fetching part number:', error);
            partNumberInput.value = 'Error';
            // Reset features on error
            this.resetFeatureVisibility();
        }
    }

    async updateFeatureAvailability() {
        const partNumberInput = document.getElementById('partNumberDisplay');
        const partNumber = partNumberInput.value;
        
        // Reset feature visibility if part number is empty or shows error states
        if (!partNumber || partNumber === 'Not found' || partNumber === 'Error' || partNumber.includes('Part number will appear')) {
            this.resetFeatureVisibility();
            return;
        }
        
        try {
            const response = await fetch(`/api/feature-availability?part_number=${encodeURIComponent(partNumber)}`);
            const result = await response.json();
            
            if (response.ok && result.features) {
                this.applyFeatureVisibility(result.features);
            } else {
                this.resetFeatureVisibility();
            }
        } catch (error) {
            console.error('Error fetching feature availability:', error);
            this.resetFeatureVisibility();
        }
    }


    applyFeatureVisibility(features) {
        // Show/hide form fields based on feature availability
        const featureMap = {
            'advanced_weather_tracking': 'weatherConditionSeverity',
            'route_optimization': 'routeRiskLevel',
            'disruption_prediction': 'disruptionLikelihoodScore',
            'reliability_scoring': 'supplierReliabilityScore'
        };
        
        Object.entries(featureMap).forEach(([featureKey, fieldId]) => {
            const isAvailable = features[featureKey];
            const fieldContainer = document.querySelector(`[data-feature="${featureKey}"]`);
            const field = document.getElementById(fieldId);
            
            if (fieldContainer && field) {
                if (isAvailable) {
                    // Show field
                    fieldContainer.style.display = 'block';
                    fieldContainer.style.opacity = '1';
                    field.disabled = false;
                    
                    // Update badge to show available
                    const badge = fieldContainer.querySelector(`[data-feature-badge="${featureKey}"]`);
                    if (badge) {
                        badge.className = badge.className.replace('bg-secondary', 'bg-success');
                        badge.textContent = badge.textContent.replace('Unavailable', '');
                    }
                } else {
                    // Dim and disable field
                    fieldContainer.style.opacity = '0.5';
                    field.disabled = true;
                    field.value = '';
                    
                    // Update badge to show unavailable
                    const badge = fieldContainer.querySelector(`[data-feature-badge="${featureKey}"]`);
                    if (badge) {
                        badge.className = badge.className.replace(/bg-(success|info|warning|primary)/, 'bg-secondary');
                        badge.textContent = 'Unavailable';
                    }
                }
            }
        });
        
        // Note: All models remain available for selection, but features are controlled
        // No need to restrict model dropdown
    }


    resetFeatureVisibility() {
        // Reset all features to visible and enabled
        const featureFields = document.querySelectorAll('[data-feature]');
        featureFields.forEach(container => {
            container.style.display = 'block';
            container.style.opacity = '1';
            
            const field = container.querySelector('input, select');
            if (field) {
                field.disabled = false;
            }
            
            // Reset badges
            const badge = container.querySelector('[data-feature-badge]');
            if (badge) {
                const featureType = badge.getAttribute('data-feature-badge');
                const badgeClasses = {
                    'advanced_weather_tracking': 'bg-info',
                    'route_optimization': 'bg-warning', 
                    'disruption_prediction': 'bg-success',
                    'reliability_scoring': 'bg-primary'
                };
                
                badge.className = `badge ${badgeClasses[featureType]} ms-2`;
                const badgeTexts = {
                    'advanced_weather_tracking': 'Advanced',
                    'route_optimization': 'Premium',
                    'disruption_prediction': 'Predictive', 
                    'reliability_scoring': 'Standard'
                };
                badge.textContent = badgeTexts[featureType];
            }
        });
        
        // Reset model dropdown to show all models
        this.populateModelDropdown();
    }

    populateModelDropdown() {
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.innerHTML = '<option value="">Choose a model...</option>';
        Object.entries(this.models).forEach(([key, model]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = model.name;
            // Set median model as default
            if (key === 'model-1') {
                option.selected = true;
            }
            modelSelect.appendChild(option);
        });
    }

    async populateFieldsFromPartNumber(partNumber) {
        // First update feature availability
        await this.updateFeatureAvailability();
        
        // Get part number details to populate region and MGC5
        try {
            const response = await fetch(`/api/feature-availability?part_number=${encodeURIComponent(partNumber)}`);
            const result = await response.json();
            
            if (response.ok && result.features) {
                const features = result.features;
                
                // Populate Region field
                const regionSelect = document.getElementById('supplierCountrySelect');
                const mgc5Select = document.getElementById('productSelect');
                
                // Find and set the region value
                const regionValue = this.getRegionValue(features.region);
                if (regionValue) {
                    regionSelect.value = regionValue;
                }
                
                // Find and set the MGC5 value  
                const mgc5Value = this.getMGC5Value(features.mgc5);
                if (mgc5Value) {
                    mgc5Select.value = mgc5Value;
                }
                
                console.log(`Part Number ${partNumber} populated: Region=${features.region}, MGC5=${features.mgc5}, Category=${features.part_category}`);
            }
        } catch (error) {
            console.error('Error fetching part number details:', error);
        }
    }

    getRegionValue(regionText) {
        // Convert region text (e.g., 'R1') to dropdown value (e.g., 1)
        const regionMap = {
            'R1': '1',
            'R2': '2', 
            'R3': '3',
            'R4': '4'
        };
        return regionMap[regionText];
    }

    getMGC5Value(mgc5Text) {
        // Convert MGC5 text (e.g., 'D1408') to dropdown value (e.g., 1408)
        const mgc5Map = {
            'D1408': '1408',
            'D1601': '1601',
            'D0303': '303'
        };
        return mgc5Map[mgc5Text];
    }

    async handleDirectPartNumberInput(partNumber) {
        // User typed directly in part number field - populate region and MGC5
        try {
            const response = await fetch(`/api/feature-availability?part_number=${encodeURIComponent(partNumber)}`);
            const result = await response.json();
            
            if (response.ok && result.features) {
                const features = result.features;
                
                // Populate Region and MGC5 fields based on part number
                const regionSelect = document.getElementById('supplierCountrySelect');
                const mgc5Select = document.getElementById('productSelect');
                
                // Set region value
                const regionValue = this.getRegionValue(features.region);
                if (regionValue) {
                    regionSelect.value = regionValue;
                }
                
                // Set MGC5 value
                const mgc5Value = this.getMGC5Value(features.mgc5);
                if (mgc5Value) {
                    mgc5Select.value = mgc5Value;
                }
                
                // Apply feature visibility
                this.applyFeatureVisibility(features);
                
                // Hide any previous error messages
                this.hideError();
                
                // Update predict button state
                this.updatePredictButton();
                
                console.log(`Direct part number input "${partNumber}" populated: Region=${features.region}, MGC5=${features.mgc5}, Category=${features.part_category}`);
            } else {
                // Part number not found - show "no model" message and reset features
                this.showNoModelAvailable(partNumber);
                this.resetFeatureVisibility();
                console.log(`Part number "${partNumber}" not found in database`);
            }
        } catch (error) {
            console.error('Error looking up part number:', error);
            this.resetFeatureVisibility();
        }
    }

    showNoModelAvailable(partNumber) {
        // Clear region and MGC5 when part number is not found
        document.getElementById('supplierCountrySelect').value = '';
        document.getElementById('productSelect').value = '';
        
        // Show error message indicating no model is available
        this.showError(`No price prediction model currently available for part number "${partNumber}".`);
        
        // Disable the predict button
        document.getElementById('predictBtn').disabled = true;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ShippingCostApp();
});