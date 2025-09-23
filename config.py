import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Base URL for Databricks Model Serving
    DATABRICKS_BASE_URL = os.getenv('DATABRICKS_BASE_URL', 'https://wl-dbr-dbr-dev-ws-wl.cloud.databricks.com/serving-endpoints/shipping-price')
    DATABRICKS_TOKEN = os.getenv('DATABRICKS_TOKEN', 'your-token-here')
    
    # Databricks Model Serving Endpoints
    MODEL_ENDPOINTS = {
        'shipping_cost_90th_percentile': {
            'name': 'Shipping Cost 90th Percentile Model',
            'model_name': 'shipping_cost_90th_percentile-1',
            'url': f"{DATABRICKS_BASE_URL}/served-models/shipping-cost-90th-percentile-1/invocations",
            'token': DATABRICKS_TOKEN,
            'description': 'Predicts 90th percentile shipping costs for worst-case scenario planning',
            'input_schema': {
                'lead_time_days': {'type': 'double', 'description': 'Expected delivery time in days', 'min': 1, 'max': 365},
                'supplier_reliability_score': {'type': 'double', 'description': 'Supplier reliability rating (0-100)', 'min': 0, 'max': 100},
                'weather_condition_severity': {'type': 'double', 'description': 'Weather impact severity score (0-10)', 'min': 0, 'max': 10},
                'route_risk_level': {'type': 'double', 'description': 'Route security and safety risk (0-10)', 'min': 0, 'max': 10},
                'disruption_likelihood_score': {'type': 'double', 'description': 'Probability of shipping disruptions (0-100)', 'min': 0, 'max': 100},
                'risk_classification': {'type': 'long', 'description': 'Risk category classification (1-4)', 'min': 1, 'max': 4},
                'supplier_country': {
                    'type': 'long', 
                    'description': 'Region code', 
                    'dropdown': True,
                    'options': [
                        {'value': 1, 'text': 'R1'},
                        {'value': 2, 'text': 'R2'},
                        {'value': 3, 'text': 'R3'},
                        {'value': 4, 'text': 'R4'}
                    ]
                },
                'product_id': {
                    'type': 'long', 
                    'description': 'MGC5 product code', 
                    'dropdown': True,
                    'options': [
                        {'value': 1408, 'text': 'D1408'},
                        {'value': 1601, 'text': 'D1601'},
                        {'value': 303, 'text': 'D0303'}
                    ]
                }
            },
            'sample_input': {
                'lead_time_days': 14.5,
                'supplier_reliability_score': 85.2,
                'weather_condition_severity': 3.1,
                'route_risk_level': 2.8,
                'disruption_likelihood_score': 15.6,
                'risk_classification': 3,
                'supplier_country': 2,
                'product_id': 1408
            }
        },
        'shipping_cost_10th_percentile': {
            'name': 'Shipping Cost 10th Percentile',
            'model_name': 'shipping_cost_xgboost-1',
            'url': f"{DATABRICKS_BASE_URL}/served-models/shipping-cost-10th-percentile-1/invocations",
            'token': DATABRICKS_TOKEN,
            'description': 'XGBoost-based shipping cost prediction model for general use cases',
            'input_schema': {
                'lead_time_days': {'type': 'double', 'description': 'Expected delivery time in days', 'min': 1, 'max': 365},
                'supplier_reliability_score': {'type': 'double', 'description': 'Supplier reliability rating (0-100)', 'min': 0, 'max': 100},
                'weather_condition_severity': {'type': 'double', 'description': 'Weather impact severity score (0-10)', 'min': 0, 'max': 10},
                'route_risk_level': {'type': 'double', 'description': 'Route security and safety risk (0-10)', 'min': 0, 'max': 10},
                'disruption_likelihood_score': {'type': 'double', 'description': 'Probability of shipping disruptions (0-100)', 'min': 0, 'max': 100},
                'risk_classification': {'type': 'long', 'description': 'Risk category classification (1-4)', 'min': 1, 'max': 4},
                'supplier_country': {
                    'type': 'long', 
                    'description': 'Region code', 
                    'dropdown': True,
                    'options': [
                        {'value': 1, 'text': 'R1'},
                        {'value': 2, 'text': 'R2'},
                        {'value': 3, 'text': 'R3'},
                        {'value': 4, 'text': 'R4'}
                    ]
                },
                'product_id': {
                    'type': 'long', 
                    'description': 'MGC5 product code', 
                    'dropdown': True,
                    'options': [
                        {'value': 1408, 'text': 'D1408'},
                        {'value': 1601, 'text': 'D1601'},
                        {'value': 303, 'text': 'D0303'}
                    ]
                }
            },
            'sample_input': {
                'lead_time_days': 10.0,
                'supplier_reliability_score': 90.0,
                'weather_condition_severity': 2.5,
                'route_risk_level': 2.0,
                'disruption_likelihood_score': 12.0,
                'risk_classification': 2,
                'supplier_country': 1,
                'product_id': 1601
            }
        },
        'shipping_cost_median': {
            'name': 'Shipping Cost Median Model', 
            'model_name': 'shipping_cost_median-1',
            'url': f"{DATABRICKS_BASE_URL}/served-models/shipping-cost-xgboost-1/invocations",
            'token': DATABRICKS_TOKEN,
            'description': 'Median-based shipping cost prediction for balanced estimates',
            'input_schema': {
                'lead_time_days': {'type': 'double', 'description': 'Expected delivery time in days', 'min': 1, 'max': 365},
                'supplier_reliability_score': {'type': 'double', 'description': 'Supplier reliability rating (0-100)', 'min': 0, 'max': 100},
                'weather_condition_severity': {'type': 'double', 'description': 'Weather impact severity score (0-10)', 'min': 0, 'max': 10},
                'route_risk_level': {'type': 'double', 'description': 'Route security and safety risk (0-10)', 'min': 0, 'max': 10},
                'disruption_likelihood_score': {'type': 'double', 'description': 'Probability of shipping disruptions (0-100)', 'min': 0, 'max': 100},
                'risk_classification': {'type': 'long', 'description': 'Risk category classification (1-4)', 'min': 1, 'max': 4},
                'supplier_country': {
                    'type': 'long', 
                    'description': 'Region code', 
                    'dropdown': True,
                    'options': [
                        {'value': 1, 'text': 'R1'},
                        {'value': 2, 'text': 'R2'},
                        {'value': 3, 'text': 'R3'},
                        {'value': 4, 'text': 'R4'}
                    ]
                },
                'product_id': {
                    'type': 'long', 
                    'description': 'MGC5 product code', 
                    'dropdown': True,
                    'options': [
                        {'value': 1408, 'text': 'D1408'},
                        {'value': 1601, 'text': 'D1601'},
                        {'value': 303, 'text': 'D0303'}
                    ]
                }
            },
            'sample_input': {
                'lead_time_days': 7.0,
                'supplier_reliability_score': 88.0,
                'weather_condition_severity': 2.0,
                'route_risk_level': 1.5,
                'disruption_likelihood_score': 10.0,
                'risk_classification': 2,
                'supplier_country': 3,
                'product_id': 303
            }
        }
    }
    
    # Default headers for Databricks API calls
    @staticmethod
    def get_headers(token):
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
