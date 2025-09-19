# Databricks Model Serving App

A simple web application that allows you to switch between multiple Databricks model serving endpoints and make predictions through a user-friendly interface.

## Features

- **Model Switching**: Easily switch between different Databricks model endpoints
- **Interactive UI**: Clean, responsive web interface built with Bootstrap
- **JSON Input**: Flexible JSON input format for predictions
- **Real-time Results**: View prediction results instantly
- **Health Monitoring**: Check the health status of the application
- **Error Handling**: Comprehensive error handling and user feedback

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Your Endpoints

1. Copy the example environment file:
   ```bash
   cp env_example.txt .env
   ```

2. Edit the `.env` file with your actual Databricks endpoints and tokens:
   ```
   DATABRICKS_ENDPOINT_1=https://your-workspace.cloud.databricks.com/serving-endpoints/your-model-1/invocations
   DATABRICKS_TOKEN_1=your-databricks-token-1
   
   DATABRICKS_ENDPOINT_2=https://your-workspace.cloud.databricks.com/serving-endpoints/your-model-2/invocations
   DATABRICKS_TOKEN_2=your-databricks-token-2
   ```

### 3. Run the Application

```bash
python app.py
```

The application will be available at `http://localhost:5000`

## Usage

1. **Select a Model**: Choose from the dropdown which model endpoint to use
2. **Enter Input Data**: Provide your input data in JSON format
3. **Make Prediction**: Click the "Make Prediction" button
4. **View Results**: See the prediction results displayed below

## Input Data Formats

The application supports multiple input formats:

### Simple Instance Format
```json
{
  "feature1": 1.5,
  "feature2": "value",
  "feature3": 42
}
```

### DataFrame Split Format
```json
{
  "dataframe_split": {
    "columns": ["feature1", "feature2"],
    "data": [[1.5, "value"], [2.0, "other"]]
  }
}
```

### Multiple Instances Format
```json
{
  "instances": [
    {"feature1": 1.5, "feature2": "value1"},
    {"feature1": 2.0, "feature2": "value2"}
  ]
}
```

## API Endpoints

- `GET /` - Main application interface
- `GET /api/models` - List available models
- `POST /api/predict` - Make predictions
- `GET /api/health` - Health check

## Project Structure

```
databricks-model-app/
├── app.py                 # Flask application
├── config.py             # Configuration settings
├── requirements.txt      # Python dependencies
├── env_example.txt       # Environment variables example
├── README.md            # This file
├── templates/
│   └── index.html       # Main HTML template
└── static/
    ├── css/
    │   └── style.css    # Custom styles
    └── js/
        └── app.js       # Frontend JavaScript
```

## Customization

### Adding More Models

To add more models, edit the `MODEL_ENDPOINTS` dictionary in `config.py`:

```python
MODEL_ENDPOINTS = {
    'model_1': {...},
    'model_2': {...},
    'model_3': {
        'name': 'Model 3',
        'url': 'your-endpoint-url',
        'token': 'your-token'
    }
}
```

### Modifying Input Formats

The application automatically handles different input formats. If you need to customize the payload format, modify the `predict` method in the `DatabricksModelClient` class.

## Troubleshooting

1. **Connection Errors**: Verify your endpoint URLs and tokens are correct
2. **Authentication Errors**: Ensure your Databricks tokens have the necessary permissions
3. **JSON Format Errors**: Use the examples provided or validate your JSON before submitting

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- Use environment variables for production deployments
- Consider implementing additional authentication for production use
# databricks-model-serving
