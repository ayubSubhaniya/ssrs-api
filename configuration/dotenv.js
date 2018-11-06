const dotenv = require('dotenv');

const { error } = dotenv.config();
if (error) {
    console.log(".env file is not found. Make sure you have set all environment variables.")
    //throw error('Please add .env file');
}
