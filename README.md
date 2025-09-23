# Databricks Model Serving - Pricing Cost Prediction

A sophisticated web application for pricing cost prediction using multiple Databricks model serving endpoints with intelligent lookup functionality and real-time part number resolution.

## Features

- **Smart Default Selection**: Auto-defaults to R1 region and median model for optimal user experience
- **Part Number Lookup**: Real-time part number resolution based on MGC5 and Region selection
- **Multi-Model Prediction**: Run all 3 models simultaneously or select individual models
- **Interactive UI**: Clean, responsive web interface with Bootstrap and real-time updates
- **Lookup Table Integration**: Comprehensive MGC5/Region to Part Number mapping
- **Health Monitoring**: Built-in system health checks and error handling
- **Flexible Input**: Form-based input with validation and sample data loading

## Quick Start

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file with your Databricks configuration:

```env
DATABRICKS_BASE_URL=https://your-workspace.cloud.databricks.com/serving-endpoints/shipping-price
DATABRICKS_TOKEN=your-actual-databricks-token
```

**⚠️ Important**: Never commit your `.env` file to git as it contains sensitive tokens!

### 3. Run the Application

```bash
python app.py
```

The application will start on `http://localhost:8001`

## Model Configuration

The application supports three pricing prediction models:

### Available Models

1. **Shipping Cost 10th Percentile** - Best-case scenario predictions
2. **Shipping Cost Median Model** - Balanced estimates (default)
3. **Shipping Cost 90th Percentile** - Worst-case scenario planning

### Input Parameters

| Parameter | Type | Description | Range/Options |
|-----------|------|-------------|---------------|
| **Region** | Dropdown | Geographic region (R1, R2, R3, R4) | R1 (default) |
| **MGC5** | Dropdown | Product code (D1408, D1601, D0303) | User selection |
| **Risk Level** | Dropdown | Risk classification | 1-4 (Low to Very High) |
| **Lead Time Days** | Double | Expected delivery time | 0.5-365 days |
| **Supplier Reliability Score** | Double | Reliability rating | 0-100% |
| **Weather Condition Severity** | Double | Weather impact score | 0-10 |
| **Route Risk Level** | Double | Route security risk | 0-10 |
| **Disruption Likelihood Score** | Double | Disruption probability | 0-100% |

## Part Number Lookup Table

The application includes a comprehensive lookup table for part number resolution:

| MGC5  | Region | Part Number |
|-------|--------|-------------|
| D1408 | R4     | KK24076     |
| D1408 | R3     | KK110968    |
| D1408 | R2     | KK113130    |
| D1408 | R1     | ADX16694    |
| D1601 | R4     | F682849     |
| D1601 | R3     | AW30717     |
| D1601 | R2     | L227221     |
| D0303 | R4     | AH145242    |
| D0303 | R3     | AFH218732   |
| D0303 | R1     | ADX12969    |

## Usage

### Default Behavior

- **Region**: Automatically set to R1
- **Prediction Mode**: All Models (simultaneous)
- **Individual Model**: Median model pre-selected
- **Part Number**: Auto-populates when Region and MGC5 are selected

### Prediction Modes

1. **All Models (Default)**: Runs all three models simultaneously
   - Provides 10th percentile, median, and 90th percentile predictions
   - Includes comparison summary and statistics
   
2. **Individual Model**: Select and run a specific model
   - Choose from any of the three available models
   - Detailed single-model results

### Web Interface Features

1. **Smart Defaults**: Application loads with optimal default selections
2. **Real-time Updates**: Part numbers update instantly when selections change
3. **Form Validation**: Comprehensive input validation with helpful error messages
4. **Sample Data**: Load pre-configured sample data for quick testing
5. **Health Check**: Monitor system status and model availability
6. **Results Display**: Clear, organized prediction results with raw data access

## API Endpoints

- `GET /`: Main web interface
- `GET /api/models`: Get available models and their schemas
- `POST /api/predict`: Make individual model predictions
- `POST /api/predict/all`: Run all models simultaneously
- `GET /api/part-number`: Get part number for MGC5/Region combination
- `GET /api/health`: Health check endpoint

### API Usage Examples

#### Part Number Lookup
```bash
curl "http://localhost:8001/api/part-number?mgc5=D1408&region=R1"
```

#### Individual Prediction
```bash
curl -X POST http://localhost:8001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "model": "shipping_cost_median",
    "input": {
      "supplier_country": 1,
      "product_id": 1408,
      "risk_classification": 3,
      "lead_time_days": 14.5,
      "supplier_reliability_score": 85.2,
      "weather_condition_severity": 3.1,
      "route_risk_level": 2.8,
      "disruption_likelihood_score": 15.6
    }
  }'
```

#### All Models Prediction
```bash
curl -X POST http://localhost:8001/api/predict/all \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "supplier_country": 1,
      "product_id": 1408,
      "risk_classification": 3,
      "lead_time_days": 14.5,
      "supplier_reliability_score": 85.2,
      "weather_condition_severity": 3.1,
      "route_risk_level": 2.8,
      "disruption_likelihood_score": 15.6
    }
  }'
```

## Development

### Project Structure

```
databricks-model-serving/
├── app.py              # Main Flask application
├── config.py           # Configuration, model schemas, and lookup tables
├── requirements.txt    # Python dependencies
├── .env               # Environment variables (create from .env.example)
├── README.md          # This file
├── templates/
│   └── index.html     # Main web interface
└── static/
    ├── css/
    │   └── style.css  # Custom styles
    └── js/
        └── app.js     # Frontend JavaScript with lookup logic
```

### Key Components

1. **Lookup System**: Real-time part number resolution
2. **Multi-Model Support**: Concurrent model execution capability
3. **Smart Defaults**: Optimal user experience with pre-selected values
4. **Validation Layer**: Comprehensive input validation and error handling
5. **Responsive UI**: Bootstrap-based interface with modern UX patterns

### Adding New Lookup Entries

To add new MGC5/Region combinations:

1. Update `PART_NUMBER_LOOKUP` in `config.py`
2. Add the new MGC5 option to model input schemas if needed
3. The frontend will automatically support the new combinations

### Extending Models

To add new models:

1. Add model configuration to `MODEL_ENDPOINTS` in `config.py`
2. Include input schema and sample data
3. Update frontend model mappings if using custom display names

## Security & Best Practices

- **Environment Variables**: All sensitive data stored in `.env` file
- **Input Validation**: Server-side and client-side validation
- **Error Handling**: Comprehensive error catching and user feedback
- **CORS Support**: Configured for cross-origin requests
- **Token Security**: Databricks tokens never exposed in frontend

## Troubleshooting

### Common Issues

1. **ModuleNotFoundError**: Install dependencies with `pip install -r requirements.txt`
2. **Port 8001 in use**: Change port in `app.py` or kill existing process
3. **Missing .env file**: Create `.env` with your Databricks configuration
4. **Part number not found**: Verify MGC5/Region combination exists in lookup table
5. **Model prediction failures**: Check Databricks token permissions and endpoint URLs

### Getting Help

- Check browser console for frontend errors
- Review Flask application logs for backend issues
- Verify Databricks model serving endpoints are active
- Ensure proper environment variable configuration
- Test individual API endpoints to isolate issues

## Dependencies

See `requirements.txt` for complete list. Key dependencies:

- Flask: Web framework
- Flask-CORS: Cross-origin resource sharing
- Requests: HTTP client for Databricks API calls
- Python-dotenv: Environment variable management

---

**Ready to use!** The application provides intelligent defaults and guided workflows for optimal pricing cost predictions.