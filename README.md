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

### 1. Clone and Navigate to Project

```bash
git clone https://github.com/Akhil-ender/databricks-model-serving.git
cd databricks-model-serving
```

### 2. Environment Configuration

Copy the example environment file and configure your Databricks endpoints:

```bash
cp .env.example .env
```

Edit the `.env` file with your actual Databricks model serving endpoints and tokens:

```env
# Model 1 Endpoint Configuration
DATABRICKS_ENDPOINT_1=https://your-workspace.cloud.databricks.com/serving-endpoints/model-1/invocations
DATABRICKS_TOKEN_1=your-actual-databricks-token

# Model 2 Endpoint Configuration  
DATABRICKS_ENDPOINT_2=https://your-workspace.cloud.databricks.com/serving-endpoints/model-2/invocations
DATABRICKS_TOKEN_2=your-actual-databricks-token
```

**⚠️ Important**: Never commit your `.env` file to git as it contains sensitive tokens!

### 4. Run the Application

```bash
python app.py
```

The application will start on `http://localhost:8001`

## Model Configuration

Both models currently support the same Titanic survival prediction parameters:

| Parameter | Type | Description | Range |
|-----------|------|-------------|-------|
| **Pclass** | long | Passenger class (1=First, 2=Second, 3=Third) | 1-3 |
| **Sex** | long | Gender (0=Female, 1=Male) | 0-1 |
| **Age** | double | Age in years | 0-120 |
| **SibSp** | long | Number of siblings/spouses aboard | 0-10 |
| **Parch** | long | Number of parents/children aboard | 0-10 |
| **Fare** | double | Ticket fare in pounds | 0-1000 |
| **Embarked_Q** | integer | Embarked at Queenstown (0=No, 1=Yes) | 0-1 |
| **Embarked_S** | integer | Embarked at Southampton (0=No, 1=Yes) | 0-1 |

## Usage

### Using the Web Interface

1. **Select a Model**: Choose between "Titanic Survival Prediction" or "Model 2 - Titanic Prediction"
2. **Choose Input Method**:
   - **Form Input**: User-friendly form with validation and field descriptions
   - **JSON Input**: Direct JSON input for advanced users
3. **Load Sample Data**: Click "Load Sample" to populate with example data
4. **Make Predictions**: Fill in the data and click "Make Prediction"

### Form Input Features

- **Real-time Validation**: Fields validate input ranges and data types
- **Descriptive Labels**: Each field includes helpful descriptions
- **Sample Data**: Different sample profiles for each model
- **Error Feedback**: Clear validation messages for invalid inputs

### API Endpoints

- `GET /`: Main web interface
- `GET /api/models`: Get available models and their schemas
- `POST /api/predict`: Make predictions (requires model key and input data)
- `GET /api/health`: Health check endpoint

### JSON Input Format

For direct API calls or JSON input mode:

```json
{
  "Pclass": 3,
  "Sex": 1,
  "Age": 22.0,
  "SibSp": 1,
  "Parch": 0,
  "Fare": 7.25,
  "Embarked_Q": 0,
  "Embarked_S": 1
}
```

## Development

### Project Structure

```
databricks-model-app/
├── app.py              # Main Flask application
├── config.py           # Configuration and model schemas
├── requirements.txt    # Python dependencies
├── .env.example       # Environment template
├── .gitignore         # Git ignore rules
├── templates/
│   └── index.html     # Main web interface
└── static/
    ├── css/
    │   └── style.css  # Custom styles
    └── js/
        └── app.js     # Frontend JavaScript
```

### Adding New Models

To add a new model:

1. Update `config.py` with the new model endpoint configuration
2. Include the input schema and sample data
3. The frontend will automatically generate the appropriate form

## Security Notes

- Environment variables (`.env`) are automatically ignored by git
- GitHub secret scanning will prevent accidental token commits
- Use `.env.example` as a template for new setups
- Never expose Databricks tokens in your code or commits

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `app.py` if 8001 is occupied
2. **Missing .env file**: Copy `.env.example` to `.env` and configure your endpoints
3. **Invalid tokens**: Ensure your Databricks tokens have the correct permissions
4. **CORS issues**: The app includes CORS headers for cross-origin requests

### Getting Help

- Check the browser console for JavaScript errors
- Review Flask logs for backend issues
- Verify your Databricks endpoint URLs and tokens
- Ensure your model serving endpoints are active and accessible
