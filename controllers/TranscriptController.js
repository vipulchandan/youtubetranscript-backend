const TranscriptModel = require('../models/TranscriptModel');
const { getSubtitles } = require('youtube-captions-scraper');
const ytdl = require('ytdl-core');

// Extract video ID from the YouTube URL
const extractVideoId = (url) => {
  const regex = /(?:\/embed\/|v=|v\/|vi\/|youtu\.be\/|\/v\/|^https?:\/\/(?:www\.)?youtube\.com\/(?:(?:watch)?\?.*v=|(?:embed|v|vi|user)\/))([^#\&\?]*).*/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Fetch video info using ytdl-core package
async function fetchVideoInfo(videoUrl) {
  try {
    const info = await ytdl.getInfo(videoUrl);
    return { title: info.videoDetails.title };
  } catch (error) {
    throw new Error('Error fetching video information.');
  }
}

// Fetch video transcript using the youtube-captions-scraper package
async function fetchVideoTranscript(videoId) {
  const captions = await getSubtitles({
    videoID: videoId,
    lang: 'en', // Assuming English captions are required
  });

  if (!captions || captions.length === 0) {
    return { transcript: "No transcript available" }; 
  }

  const transcriptText = captions.reduce((acc, caption) => {
    return acc + caption.text + ' \n';
  }, '');

  return { transcript: transcriptText };
}


const createVideoTranscript = async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ 
            error: 'videoUrl is missing in the request body.'
        });
    }

    const videoId = extractVideoId(videoUrl);
    const existingVideo = await TranscriptModel.findOne({ videoId });

    if (existingVideo) {
      res.json({
        videoUrl: existingVideo.videoUrl,
        transcript: existingVideo.transcript,
      });
    } else {
      const videoInfo = await fetchVideoInfo(videoUrl);
      const transcriptData = await fetchVideoTranscript(videoId);

      // Save video details in MongoDB
      const video = new TranscriptModel({
        videoId,
        title: videoInfo.title,
        videoUrl,
        transcript: transcriptData.transcript,
      });

      await video.save();

      res.status(201).json({
        message: 'Video saved successfully.',
        videoUrl,
        transcript: transcriptData.transcript,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
        message: error.message,
    });
  }
};


module.exports = {
    createVideoTranscript
}