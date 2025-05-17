#!/bin/bash

# Navigate to server directory
cd server

# Build the project
echo "Building the project..."
python -m pip install -r requirements.txt
python manage.py collectstatic --noinput

# Make build_files.sh executable
chmod +x build_files.sh 