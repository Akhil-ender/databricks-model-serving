from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests
import json
import logging
from config import Config

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
            
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
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

@app.route('/api/models', methods=['GET'])
def get_models():
    """Get list of available models"""
    models = {}
    for key, config in Config.MODEL_ENDPOINTS.items():
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

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "models_configured": len(Config.MODEL_ENDPOINTS)
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8001)
