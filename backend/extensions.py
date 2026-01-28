"""Flask extensions initialization"""
from flask_pymongo import PyMongo
from flask_cors import CORS

# Initialize extensions
mongo = PyMongo()
cors = CORS()
