import os
import time
from typing import Dict, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Base URL for Databricks Model Serving
    DATABRICKS_BASE_URL = os.getenv('DATABRICKS_BASE_URL', 'https://wl-dbr-dbr-dev-ws-wl.cloud.databricks.com/serving-endpoints/shipping-price')
    DATABRICKS_TOKEN = os.getenv('DATABRICKS_TOKEN', 'your-token-here')
    
    # Databricks SQL settings for lookup table (optional; falls back to local dict)
    DATABRICKS_SQL_HTTP_PATH = os.getenv('DATABRICKS_SQL_HTTP_PATH')
    DATABRICKS_WAREHOUSE_ID = os.getenv('DATABRICKS_WAREHOUSE_ID')  # optional shorthand
    DATABRICKS_CATALOG = os.getenv('DATABRICKS_CATALOG', 'hive_metastore')
    DATABRICKS_SCHEMA = os.getenv('DATABRICKS_SCHEMA', 'default')
    PART_LOOKUP_TABLE = os.getenv('PART_LOOKUP_TABLE', 'part_lookup')  # e.g. part_lookup; will be qualified with catalog.schema if provided
    PART_LOOKUP_TTL_SECONDS = int(os.getenv('PART_LOOKUP_TTL_SECONDS', '300'))
    
    # Lookup table for SKUGroup/Region to Part Number mapping
    # This should be stored in Databricks table with columns: SKUGroup, Region, SKU
    
    # In-memory cache populated from Databricks table on demand
    _PART_NUMBER_LOOKUP_CACHE: Optional[Dict[Tuple[str, str], str]] = None
    _PART_NUMBER_LOOKUP_CACHE_TS: Optional[float] = None
    
    @classmethod
    def _is_db_lookup_configured(cls) -> bool:
        return bool(cls.DATABRICKS_TOKEN and (cls.DATABRICKS_SQL_HTTP_PATH or cls.DATABRICKS_WAREHOUSE_ID) and cls.PART_LOOKUP_TABLE)
    
    @classmethod
    def _get_qualified_table_name(cls) -> str:
        if cls.DATABRICKS_CATALOG and cls.DATABRICKS_SCHEMA:
            return f"{cls.DATABRICKS_CATALOG}.{cls.DATABRICKS_SCHEMA}.{cls.PART_LOOKUP_TABLE}"
        if cls.DATABRICKS_SCHEMA:
            return f"{cls.DATABRICKS_SCHEMA}.{cls.PART_LOOKUP_TABLE}"
        return cls.PART_LOOKUP_TABLE or ''
    
    @classmethod
    def _load_part_lookup_from_db(cls) -> Optional[Dict[Tuple[str, str], str]]:
        """Attempt to load the part lookup from Databricks SQL. Returns dict or None on failure."""
        import logging
        logger = logging.getLogger(__name__)
        
        if not cls._is_db_lookup_configured():
            logger.error("Databricks SQL not configured. Please check environment variables:")
            logger.error(f"DATABRICKS_TOKEN set: {bool(cls.DATABRICKS_TOKEN)}")
            logger.error(f"DATABRICKS_SQL_HTTP_PATH set: {bool(cls.DATABRICKS_SQL_HTTP_PATH)}")
            logger.error(f"DATABRICKS_WAREHOUSE_ID set: {bool(cls.DATABRICKS_WAREHOUSE_ID)}")
            logger.error(f"PART_LOOKUP_TABLE set: {bool(cls.PART_LOOKUP_TABLE)}")
            return None
        try:
            # Lazy import to avoid hard dependency at runtime if not used
            from databricks import sql as dbsql
            logger.info("Successfully imported databricks-sql-connector")
            http_path = cls.DATABRICKS_SQL_HTTP_PATH or f"/sql/1.0/warehouses/{cls.DATABRICKS_WAREHOUSE_ID}"
            table_name = cls._get_qualified_table_name()
            logger.info(f"Attempting to connect to Databricks SQL with:")
            logger.info(f"Host: {cls._extract_hostname_from_base_url(cls.DATABRICKS_BASE_URL)}")
            logger.info(f"HTTP Path: {http_path}")
            logger.info(f"Table: {table_name}")
            
            if not table_name:
                logger.error("Table name could not be determined")
                return None
            try:
                with dbsql.connect(
                    server_hostname=cls._extract_hostname_from_base_url(cls.DATABRICKS_BASE_URL),
                    http_path=http_path,
                    access_token=cls.DATABRICKS_TOKEN
                ) as connection:
                    logger.info("Successfully connected to Databricks SQL")
                    with connection.cursor() as cursor:
                        query = f"SELECT SKUGroup, Region, SKU FROM {table_name}"
                        logger.info(f"Executing query: {query}")
                        cursor.execute(query)
                        rows = cursor.fetchall()
                        logger.info(f"Retrieved {len(rows)} rows from table")
                        lookup: Dict[Tuple[str, str], str] = {}
                        for row in rows:
                            sku_group = str(row[0]).strip()
                            region = str(row[1]).strip()
                            sku = str(row[2]).strip()
                            if sku_group and region and sku:
                                lookup[(sku_group, region)] = sku
                        return lookup if lookup else None
            except Exception as e:
                logger.error(f"Error connecting to Databricks SQL: {str(e)}")
                return None
        except Exception as e:
            logger.error(f"Failed to import databricks-sql-connector: {str(e)}")
            return None
    
    @staticmethod
    def _extract_hostname_from_base_url(base_url: str) -> str:
        # base_url may be like https://<host>/serving-endpoints/...
        try:
            host = base_url.split('://', 1)[1].split('/', 1)[0]
            return host
        except Exception:
            return base_url
    
    @classmethod
    def _ensure_lookup_cache(cls) -> None:
        """Populate or refresh the in-memory cache from DB if TTL expired; fallback to local dict."""
        now = time.time()
        if cls._PART_NUMBER_LOOKUP_CACHE and cls._PART_NUMBER_LOOKUP_CACHE_TS and (now - cls._PART_NUMBER_LOOKUP_CACHE_TS) < cls.PART_LOOKUP_TTL_SECONDS:
            return
        lookup = cls._load_part_lookup_from_db()
        if lookup is not None:
            cls._PART_NUMBER_LOOKUP_CACHE = lookup
            cls._PART_NUMBER_LOOKUP_CACHE_TS = now
        else:
            # Fallback to static dict; no TTL refresh needed
            cls._PART_NUMBER_LOOKUP_CACHE = dict(cls.PART_NUMBER_LOOKUP)
            cls._PART_NUMBER_LOOKUP_CACHE_TS = now
    
    @classmethod
    def get_part_number(cls, SKUGroup: str, region: str) -> Optional[str]:
        """Return the part number for a given (SKUGroup, region) using DB cache with fallback."""
        if not SKUGroup or not region:
            return None
        cls._ensure_lookup_cache()
        key = (str(SKUGroup).strip(), str(region).strip())
        return cls._PART_NUMBER_LOOKUP_CACHE.get(key) if cls._PART_NUMBER_LOOKUP_CACHE else None
    
    @classmethod
    def get_sku_details(cls, sku: str) -> Optional[Dict[str, str]]:
        """Return SKUGroup and region for a given SKU using reverse lookup from DB cache."""
        if not sku:
            return None
        cls._ensure_lookup_cache()
        if not cls._PART_NUMBER_LOOKUP_CACHE:
            return None
        
        # Search through the cache for the SKU
        for (sku_group, region), part_number in cls._PART_NUMBER_LOOKUP_CACHE.items():
            if part_number.strip() == sku.strip():
                return {
                    'sku_group': sku_group,
                    'region': region,
                    'part_number': part_number
                }
        return None
    
    # Feature availability based on Part Number (primary lookup component)
    # Note: All three models are always available for prediction, but UI features vary
    PART_FEATURE_AVAILABILITY = {
        # Heavy Industrial Parts - 1234 category
        '24KK076': {
            'part_category': 'Heavy Industrial',
            'skugroup': '1234',
            'region': 'R4',
            'advanced_weather_tracking': True,
            'route_optimization': True,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Heavy Industrial Parts - Full Premium Features'
        },
        '11KK0968': {
            'part_category': 'Heavy Industrial',
            'skugroup': '1234',
            'region': 'R3',
            'advanced_weather_tracking': True,
            'route_optimization': True,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Heavy Industrial Parts - Full Premium Features'
        },
        '11AB130': {
            'part_category': 'Heavy Industrial',
            'skugroup': '1234',
            'region': 'R2',
            'advanced_weather_tracking': True,
            'route_optimization': True,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Heavy Industrial Parts - Full Premium Features'
        },
        '123IK78': {
            'part_category': 'Heavy Industrial',
            'skugroup': '1234',
            'region': 'R1',
            'advanced_weather_tracking': True,
            'route_optimization': True,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Heavy Industrial Parts - Full Premium Features'
        },
        
        # Electronics/Technology Parts - F/AW/L series (4567 category)
        '76IK789': {
            'part_category': 'Electronics',
            'skugroup': '4567',
            'region': 'R4',
            'advanced_weather_tracking': True,
            'route_optimization': False,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Electronics Parts - Weather Sensitive, No Route Optimization'
        },
        '3AW0717': {
            'part_category': 'Electronics',
            'skugroup': '4567',
            'region': 'R3',
            'advanced_weather_tracking': True,
            'route_optimization': False,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Electronics Parts - Weather Sensitive, No Route Optimization'
        },
        '127IG21': {
            'part_category': 'Electronics',
            'skugroup': '4567',
            'region': 'R2',
            'advanced_weather_tracking': True,
            'route_optimization': False,
            'disruption_prediction': True,
            'reliability_scoring': True,
            'description': 'Electronics Parts - Weather Sensitive, No Route Optimization'
        },
        
        # Standard/Basic Parts - AH/AFH/ADX series (6789 category)
        '758IK56': {
            'part_category': 'Standard',
            'skugroup': '6789',
            'region': 'R4',
            'advanced_weather_tracking': False,
            'route_optimization': False,
            'disruption_prediction': False,
            'reliability_scoring': True,
            'description': 'Standard Parts - Basic Features Only'
        },
        '679IJ78': {
            'part_category': 'Standard',
            'skugroup': '6789',
            'region': 'R3',
            'advanced_weather_tracking': False,
            'route_optimization': False,
            'disruption_prediction': False,
            'reliability_scoring': True,
            'description': 'Standard Parts - Basic Features Only'
        },
        '567LA98': {
            'part_category': 'Standard',
            'skugroup': '6789',
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
                'description': 'SKUGroup product code', 
                'dropdown': True,
                'options': [
                    {'value': 1408, 'text': '1234'},
                    {'value': 1601, 'text': '4567'},
                    {'value': 303, 'text': '6789'}
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
