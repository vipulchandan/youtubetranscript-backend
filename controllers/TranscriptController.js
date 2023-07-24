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
  try {
    const captions = await getSubtitles({
      videoID: videoId,
      lang: 'en', // English captions
    });

    if (!captions || captions.length === 0) {
      // Return null or an indicator for missing subtitles
      return { transcript: null };
    }

    const transcriptText = captions.reduce((acc, caption) => {
      return acc + caption.text + ' \n';
    }, '');

    return { transcript: transcriptText };
  } catch (error) {
    console.error(error);
    // In case of an error, return an object with a transcript property
    // and set it to null or an appropriate error message
    return { transcript: null };
  }
}


const createVideoTranscript = async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        error: 'videoUrl is missing in the request body.',
      });
    }

    // Check if the youtube URL is valid
    const regex = /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=([^&]+).*/;
    if (!regex.test(videoUrl)) {
      return res.status(400).json({
        error: 'Please enter a valid YouTube video URL.',
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
        transcript: transcriptData.transcript, // It can be null or actual transcript based on the video
      });

      await video.save();

      // Check if the transcript is null and set an appropriate message
      const transcriptMessage = transcriptData.transcript === null
        ? 'Transcript not available for this video.'
        : 'Video saved successfully.';

      res.status(201).json({
        message: transcriptMessage,
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