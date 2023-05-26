
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSettingsSchema = new Schema({
  userId: String,
  settings: Object
});

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);

module.exports = UserSettings;
				