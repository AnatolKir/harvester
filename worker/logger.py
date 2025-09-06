"""
Logging configuration for the worker
"""

import sys
import structlog
from structlog.processors import JSONRenderer, ConsoleRenderer
from structlog.stdlib import add_log_level, filter_by_level

from config import config


def setup_logging():
    """Configure structured logging for the worker"""
    
    # Determine processors based on format
    if config.log_format == "json":
        renderer = JSONRenderer()
    else:
        renderer = ConsoleRenderer()
    
    # Common processors
    processors = [
        filter_by_level,
        add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.CallsiteParameterAdder(
            parameters=[
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.LINENO,
                structlog.processors.CallsiteParameter.FUNC_NAME,
            ]
        ),
    ]
    
    # Add worker context
    def add_worker_context(logger, method_name, event_dict):
        """Add worker-specific context to all log entries"""
        event_dict["worker_id"] = config.worker_id
        event_dict["environment"] = config.worker_environment
        return event_dict
    
    processors.append(add_worker_context)
    
    # Add the renderer as the last processor
    processors.append(renderer)
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Set Python logging level
    import logging
    numeric_level = getattr(logging, config.log_level.upper(), logging.INFO)
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=numeric_level,
    )
    
    # Create logger instance
    logger = structlog.get_logger()
    
    # Log initialization
    logger.info(
        "logging_configured",
        level=config.log_level,
        format=config.log_format,
        worker_id=config.worker_id,
        environment=config.worker_environment
    )
    
    return logger


# Initialize logging when module is imported
logger = setup_logging()