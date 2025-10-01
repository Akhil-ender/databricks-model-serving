import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Base URL for Databricks Model Serving
    DATABRICKS_BASE_URL = os.getenv('DATABRICKS_BASE_URL', 'https://wl-dbr-dbr-dev-ws-wl.cloud.databricks.com/serving-endpoints/shipping-price')
    DATABRICKS_TOKEN = os.getenv('DATABRICKS_TOKEN', 'your-token-here')
    
    # Lookup table for MGC5/Region to Part Number mapping
    PART_NUMBER_LOOKUP = {
        ('D1408', 'R4'): 'KK24076',
        ('D1408', 'R3'): 'KK110968', 
        ('D1408', 'R2'): 'KK113130',
        ('D1408', 'R1'): 'ADX16694',
        ('D1601', 'R4'): 'F682849',
        ('D1601', 'R3'): 'AW30717',
        ('D1601', 'R2'): 'L227221',
        ('D0303', 'R4'): 'AH145242',
        ('D0303', 'R3'): 'AFH218732',
        ('D0303', 'R1'): 'ADX12969'
    }
    
    # Feature availability based on Part Number (primary lookup component)
    # Note: All three models are always available for prediction, but UI features vary
    PART_FEATURE_AVAILABILITY = {
        # Heavy Industrial Parts - KK series (D1408 category)
        'KK24076': {
            'part_category': 'Heavy Industrial',
            'mgc5': 'D1408',
            'region': 'R4',
            'advanced_weather_tracking': True,
            'route_optimization': True,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Heavy Industrial Parts - Full Premium Features'
        },
        'KK110968': {
            'part_category': 'Heavy Industrial',
            'mgc5': 'D1408',
            'region': 'R3',
            'advanced_weather_tracking': True,
            'route_optimization': True,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Heavy Industrial Parts - Full Premium Features'
        },
        'KK113130': {
            'part_category': 'Heavy Industrial',
            'mgc5': 'D1408',
            'region': 'R2',
            'advanced_weather_tracking': True,
            'route_optimization': True,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Heavy Industrial Parts - Full Premium Features'
        },
        'ADX16694': {
            'part_category': 'Heavy Industrial',
            'mgc5': 'D1408',
            'region': 'R1',
            'advanced_weather_tracking': True,
            'route_optimization': True,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Heavy Industrial Parts - Full Premium Features'
        },
        
        # Electronics/Technology Parts - F/AW/L series (D1601 category)
        'F682849': {
            'part_category': 'Electronics',
            'mgc5': 'D1601',
            'region': 'R4',
            'advanced_weather_tracking': True,
            'route_optimization': False,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Electronics Parts - Weather Sensitive, No Route Optimization'
        },
        'AW30717': {
            'part_category': 'Electronics',
            'mgc5': 'D1601',
            'region': 'R3',
            'advanced_weather_tracking': True,
            'route_optimization': False,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Electronics Parts - Weather Sensitive, No Route Optimization'
        },
        'L227221': {
            'part_category': 'Electronics',
            'mgc5': 'D1601',
            'region': 'R2',
            'advanced_weather_tracking': True,
            'route_optimization': False,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Electronics Parts - Weather Sensitive, No Route Optimization'
        },
        
        # Standard/Basic Parts - AH/AFH/ADX series (D0303 category)
        'AH145242': {
            'part_category': 'Standard',
            'mgc5': 'D0303',
            'region': 'R4',
            'advanced_weather_tracking': False,
            'route_optimization': False,
            'disruption_prediction': False,
            'reliability_scoring': True,
            'description': 'Standard Parts - Basic Features Only'
        },
        'AFH218732': {
            'part_category': 'Standard',
            'mgc5': 'D0303',
            'region': 'R3',
            'advanced_weather_tracking': False,
            'route_optimization': False,
            'disruption_prediction': False,
            'reliability_scoring': True,
            'description': 'Standard Parts - Basic Features Only'
        },
        'ADX12969': {
            'part_category': 'Standard',
            'mgc5': 'D0303',
            'region': 'R1',
            'advanced_weather_tracking': False,
            'route_optimization': False,
            'disruption_prediction': False,
            'reliability_scoring': True,
            'description': 'Standard Parts - Basic Features Only'
        }
    }
    
    # Databricks Model Serving Endpoints - Dynamically generated for 12 models
    @classmethod
    def generate_model_endpoints(cls):
        """Generate MODEL_ENDPOINTS dictionary for 12 models dynamically"""
        endpoints = {}
        
        # Common input schema shared by all models
        common_input_schema = {
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
        }
        
        # Sample inputs for each model (can be varied or same)
        sample_inputs = [
            {
                'lead_time_days': 14.5, 'supplier_reliability_score': 85.2, 'weather_condition_severity': 3.1,
                'route_risk_level': 2.8, 'disruption_likelihood_score': 15.6, 'risk_classification': 3,
                'supplier_country': 2, 'product_id': 1408
            },
            {
                'lead_time_days': 10.0, 'supplier_reliability_score': 90.0, 'weather_condition_severity': 2.5,
                'route_risk_level': 2.0, 'disruption_likelihood_score': 12.0, 'risk_classification': 2,
                'supplier_country': 1, 'product_id': 1601
            },
            {
                'lead_time_days': 7.0, 'supplier_reliability_score': 88.0, 'weather_condition_severity': 2.0,
                'route_risk_level': 1.5, 'disruption_likelihood_score': 10.0, 'risk_classification': 2,
                'supplier_country': 3, 'product_id': 303
            }
        ]
        
        # Generate endpoints for Model-1 through Model-12
        for i in range(1, 13):
            model_key = f'Model-{i}'
            sample_input = sample_inputs[(i-1) % len(sample_inputs)]  # Cycle through sample inputs
            
            endpoints[model_key] = {
                'name': f'Model {i}',
                'model_name': model_key,
                'url': f"{cls.DATABRICKS_BASE_URL}/served-models/{model_key}/invocations",
                'token': cls.DATABRICKS_TOKEN,
                'description': f'Pricing cost prediction model {i}',
                'input_schema': common_input_schema,
                'sample_input': sample_input
            }
        
        return endpoints
    
    # Property to get the dynamically generated endpoints
    @property
    def MODEL_ENDPOINTS(self):
        if not hasattr(self, '_model_endpoints'):
            self._model_endpoints = self.generate_model_endpoints()
        return self._model_endpoints
    
    # Default headers for Databricks API calls
    @staticmethod
    def get_headers(token):
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
