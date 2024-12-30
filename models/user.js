const mongoose = require('mongoose');
const {schema , model} = mongoose;

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, min: 3, unique: true },
    password: { type: String, required: true },
});


const UserModel = model('User' , UserSchema);

module.exports = UserModel;
