from flask import Flask
from flask_pymongo import PyMongo

app = Flask(__name__)
app.config['MONGO_URI'] = 'mongodb://localhost:27017/test'

mongo = PyMongo(app)

@app.route('/')
def index():
    # Access collections through mongo.db
    users = mongo.db.users.find()
    return {'users': list(users)}

@app.route('/add')
def add_user():
    mongo.db.users.insert_one({'name': 'John', 'email': 'john@example.com'})
    return {'message': 'User added'}

if __name__ == '__main__':
    app.run(debug=True)