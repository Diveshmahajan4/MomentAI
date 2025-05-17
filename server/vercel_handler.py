import os
import sys

# Add the project directory to the sys.path
path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if path not in sys.path:
    sys.path.append(path)
    
# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'shorts_generator.settings')

# Import the WSGI application
from shorts_generator.wsgi import application

# This file is used by Vercel to deploy the Django application
app = application 