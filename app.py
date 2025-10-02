from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests
import json
import logging
from config import Config
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class DatabricksModelClient:
    def __init__(self):
        self.config = Config()
    
    def predict(self, model_key, input_data):
        """
        Make a prediction using the specified Databricks model endpoint
        
        Args:
            model_key (str): Key for the model ('model_1' or 'model_2')
            input_data (dict): Input data for the model
            
        Returns:
            dict: Prediction response or error message
        """
        if model_key not in self.config.MODEL_ENDPOINTS:
            return {"error": f"Unknown model: {model_key}"}
        
        endpoint_config = self.config.MODEL_ENDPOINTS[model_key]
        url = endpoint_config['url']
        token = endpoint_config['token']
        headers = self.config.get_headers(token)
        
        try:
            # Prepare the payload
            # Databricks expects input in a specific format, usually:
            # {"dataframe_split": {"columns": [...], "data": [...]}}
            # or {"instances": [...]}
            # This is a generic format that works with most models
            
            if isinstance(input_data, dict) and 'dataframe_split' in input_data:
                payload = input_data
            elif isinstance(input_data, dict) and 'instances' in input_data:
                payload = input_data
            else:
                # Try to wrap the input in instances format
                payload = {"instances": [input_data] if not isinstance(input_data, list) else input_data}
            
            logger.info(f"Making prediction with {endpoint_config['name']} at {url}")
            logger.info(f"Payload: {json.dumps(payload, indent=2)}")
            
            # Make timeout configurable; if not set, do not pass a timeout
            timeout_env = os.environ.get("REQUEST_TIMEOUT_SECONDS")
            request_kwargs = {
                "headers": headers,
                "json": payload,
            }
            if timeout_env:
                try:
                    request_kwargs["timeout"] = float(timeout_env)
                except ValueError:
                    logger.warning("Invalid REQUEST_TIMEOUT_SECONDS value; ignoring")
            response = requests.post(url, **request_kwargs)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Prediction successful: {result}")
                return {
                    "success": True,
                    "model": endpoint_config['name'],
                    "prediction": result
                }
            else:
                error_msg = f"API request failed with status {response.status_code}: {response.text}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "status_code": response.status_code
                }
                
        except requests.exceptions.RequestException as e:
            error_msg = f"Request failed: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }

# Initialize the model client
model_client = DatabricksModelClient()

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route("/metrics")
def metrics():
    return "ok", 200

@app.route('/api/models', methods=['GET'])
def get_models():
    """Get list of available models"""
    models = {}
    config_instance = Config()
    for key, config in config_instance.MODEL_ENDPOINTS.items():
        models[key] = {
            'name': config['name'],
            'key': key,
            'description': config.get('description', ''),
            'input_schema': config.get('input_schema', {}),
            'sample_input': config.get('sample_input', {})
        }
    return jsonify(models)

@app.route('/api/predict', methods=['POST'])
def predict():
    """Make a prediction using the selected model"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        model_key = data.get('model')
        input_data = data.get('input')
        
        if not model_key:
            return jsonify({"error": "Model key is required"}), 400
        
        if not input_data:
            return jsonify({"error": "Input data is required"}), 400
        
        # Make the prediction
        result = model_client.predict(model_key, input_data)
        
        if result.get('success', False):
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error in predict endpoint: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/predict/all', methods=['POST'])
def predict_all():
    """Make predictions using all available models simultaneously"""
    import concurrent.futures
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        input_data = data.get('input')
        
        if not input_data:
            return jsonify({"error": "Input data is required"}), 400
        
        # Get all model keys
        model_keys = list(model_client.config.MODEL_ENDPOINTS.keys())
        
        # Make concurrent predictions
        results = {}
        errors = {}
        
        def make_prediction(model_key):
            try:
                result = model_client.predict(model_key, input_data)
                return model_key, result
            except Exception as e:
                return model_key, {"success": False, "error": str(e)}
        
        # Use ThreadPoolExecutor for concurrent API calls
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            future_to_model = {executor.submit(make_prediction, model_key): model_key 
                             for model_key in model_keys}
            
            for future in concurrent.futures.as_completed(future_to_model):
                model_key, result = future.result()
                if result.get('success', False):
                    results[model_key] = result
                else:
                    errors[model_key] = result
        
        # Return combined results
        response = {
            "success": len(results) > 0,
            "timestamp": request.headers.get('X-Request-Time', ''),
            "total_models": len(model_keys),
            "successful_predictions": len(results),
            "failed_predictions": len(errors),
            "results": results
        }
        
        if errors:
            response["errors"] = errors
        
        if len(results) == 0:
            return jsonify(response), 500
        
        return jsonify(response)
            
    except Exception as e:
        logger.error(f"Error in predict_all endpoint: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/part-number', methods=['GET'])
def get_part_number():
    """Get SKU based on SKUGroup and Region"""
    try:
        # Backward compatibility: accept either SKUGroup or skugroup
        sku_group = request.args.get('SKUGroup') or request.args.get('skugroup')
        region = request.args.get('region')
        
        if not sku_group or not region:
            return jsonify({"error": "Both 'SKUGroup' and 'region' parameters are required"}), 400
        
        # Look up SKU via dynamic config (DB-backed if configured)
        part_number = Config.get_part_number(sku_group, region)
        
        if not part_number:
            return jsonify({
                "error": f"No SKU found for SKUGroup: {sku_group}, Region: {region}",
                "SKUGroup": sku_group,
                "region": region,
                "part_number": None
            }), 404
        
        return jsonify({
            "SKUGroup": sku_group,
            "region": region,
            "part_number": part_number
        })
        
    except Exception as e:
        logger.error(f"Error in SKU lookup: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/sku-lookup', methods=['GET'])
def get_sku_lookup():
    """Get SKUGroup and region based on SKU"""
    try:
        sku = request.args.get('sku')
        
        if not sku:
            return jsonify({"error": "SKU parameter is required"}), 400
        
        # Look up SKU details from Databricks table
        sku_details = Config.get_sku_details(sku)
        
        if not sku_details:
            return jsonify({
                "error": f"No SKU found: {sku}",
                "sku": sku,
                "sku_group": None,
                "region": None
            }), 404
        
        return jsonify({
            "sku": sku,
            "sku_group": sku_details['sku_group'],
            "region": sku_details['region']
        })
        
    except Exception as e:
        logger.error(f"Error in SKU lookup: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/feature-availability', methods=['GET'])
def get_feature_availability():
    """Get feature availability based on SKU (primary lookup)"""
    try:
        part_number = request.args.get('part_number')
        
        if not part_number:
            return jsonify({"error": "SKU parameter is required"}), 400
        
        # Look up feature availability by SKU
        features = Config.PART_FEATURE_AVAILABILITY.get(part_number)
        
        if not features:
            return jsonify({
                "error": f"No feature configuration found for SKU: {part_number}",
                "part_number": part_number,
                "features": None
            }), 404
        
        return jsonify({
            "part_number": part_number,
            "features": features
        })
        
    except Exception as e:
        logger.error(f"Error in feature availability lookup: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    config_instance = Config()
    return jsonify({
        "status": "healthy",
        "models_configured": len(config_instance.MODEL_ENDPOINTS)
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
