const express = require('express');
const { createVideoTranscript } = require('../controllers/TranscriptController');
const router = express.Router()

router.get('/', (req, res) => {
    res.send('Welcome To Youtube Transcripter!')
});

router.post("/transcript", createVideoTranscript)

module.exports = router