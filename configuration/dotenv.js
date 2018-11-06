const dotenv = require('dotenv');

const { error } = dotenv.config();
if (error) {
    throw error('Please add .env file');
}
