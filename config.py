import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Databricks Model Serving Endpoints
    MODEL_ENDPOINTS = {
        'model_1': {
            'name': 'Titanic Survival Prediction',
            'url': os.getenv('DATABRICKS_ENDPOINT_1', 'https://your-workspace.cloud.databricks.com/serving-endpoints/model-1/invocations'),
            'token': os.getenv('DATABRICKS_TOKEN_1', 'your-token-here'),
            'description': 'Predicts passenger survival on the Titanic based on demographic and ticket information',
            'input_schema': {
                'Pclass': {'type': 'long', 'description': 'Passenger class (1=First, 2=Second, 3=Third)', 'min': 1, 'max': 3},
                'Sex': {'type': 'long', 'description': 'Gender (0=Female, 1=Male)', 'min': 0, 'max': 1},
                'Age': {'type': 'double', 'description': 'Age in years', 'min': 0, 'max': 120},
                'SibSp': {'type': 'long', 'description': 'Number of siblings/spouses aboard', 'min': 0, 'max': 10},
                'Parch': {'type': 'long', 'description': 'Number of parents/children aboard', 'min': 0, 'max': 10},
                'Fare': {'type': 'double', 'description': 'Ticket fare in pounds', 'min': 0, 'max': 1000},
                'Embarked_Q': {'type': 'integer', 'description': 'Embarked at Queenstown (0=No, 1=Yes)', 'min': 0, 'max': 1},
                'Embarked_S': {'type': 'integer', 'description': 'Embarked at Southampton (0=No, 1=Yes)', 'min': 0, 'max': 1}
            },
            'sample_input': {
                'Pclass': 3,
                'Sex': 1,
                'Age': 22.0,
                'SibSp': 1,
                'Parch': 0,
                'Fare': 7.25,
                'Embarked_Q': 0,
                'Embarked_S': 1
            }
        },
        'model_2': {
            'name': 'Model 2 - Titanic Prediction',
            'url': os.getenv('DATABRICKS_ENDPOINT_2', 'https://your-workspace.cloud.databricks.com/serving-endpoints/model-2/invocations'),
            'token': os.getenv('DATABRICKS_TOKEN_2', 'your-token-here'),
            'description': 'Alternative Titanic survival prediction model with same input parameters',
            'input_schema': {
                'Pclass': {'type': 'long', 'description': 'Passenger class (1=First, 2=Second, 3=Third)', 'min': 1, 'max': 3},
                'Sex': {'type': 'long', 'description': 'Gender (0=Female, 1=Male)', 'min': 0, 'max': 1},
                'Age': {'type': 'double', 'description': 'Age in years', 'min': 0, 'max': 120},
                'SibSp': {'type': 'long', 'description': 'Number of siblings/spouses aboard', 'min': 0, 'max': 10},
                'Parch': {'type': 'long', 'description': 'Number of parents/children aboard', 'min': 0, 'max': 10},
                'Fare': {'type': 'double', 'description': 'Ticket fare in pounds', 'min': 0, 'max': 1000},
                'Embarked_Q': {'type': 'integer', 'description': 'Embarked at Queenstown (0=No, 1=Yes)', 'min': 0, 'max': 1},
                'Embarked_S': {'type': 'integer', 'description': 'Embarked at Southampton (0=No, 1=Yes)', 'min': 0, 'max': 1}
            },
            'sample_input': {
                'Pclass': 1,
                'Sex': 0,
                'Age': 35.0,
                'SibSp': 0,
                'Parch': 2,
                'Fare': 75.50,
                'Embarked_Q': 0,
                'Embarked_S': 1
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
