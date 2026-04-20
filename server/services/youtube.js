import axios from 'axios';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const youtubeClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

const COUNTRY_LANGUAGE_MAP = {
  KR: 'ko',
  US: 'en',
  JP: 'ja',
  TW: 'zh-TW',
  SG: 'en',
};

function ensureApiKey() {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;

  if (!apiKey) {
    const error = new Error('.env에 YOUTUBE_API_KEY가 설정되지 않았습니다.');
    error.statusCode = 500;
    error.code = 'NO_YOUTUBE_API_KEY';
    throw error;
  }

  return apiKey;
}

function parseYouTubeError(error) {
  const reason = error.response?.data?.error?.errors?.[0]?.reason;

  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
    const quotaError = new Error('YouTube API 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
    quotaError.statusCode = 429;
    quotaError.code = 'YOUTUBE_QUOTA_EXCEEDED';
    return quotaError;
  }

  const apiError = new Error(error.message || 'YouTube API 요청 중 오류가 발생했습니다.');
  apiError.statusCode = error.response?.status || 502;
  apiError.code = 'YOUTUBE_API_ERROR';
  return apiError;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value, fieldName) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const error = new Error(`${fieldName} 형식이 올바르지 않습니다. YYYY-MM-DD 형식이어야 합니다.`);
    error.statusCode = 400;
    error.code = 'INVALID_PUBLISHED_RANGE';
    throw error;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`${fieldName} 형식이 올바르지 않습니다.`);
    error.statusCode = 400;
    error.code = 'INVALID_PUBLISHED_RANGE';
    throw error;
  }

  return parsed;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildPublishedRange({ publishedAfter, publishedBefore, publishedYear }) {
  if (!publishedAfter && !publishedBefore && !publishedYear) {
    return {};
  }

  if (publishedYear) {
    const year = Number(publishedYear);
    if (!Number.isInteger(year) || year < 2005 || year > new Date().getFullYear()) {
      const error = new Error('게시 연도 필터는 2005년 이후의 유효한 연도여야 합니다.');
      error.statusCode = 400;
      error.code = 'INVALID_PUBLISHED_YEAR';
      throw error;
    }

    return {
      publishedAfter: `${year}-01-01T00:00:00Z`,
      publishedBefore: `${year + 1}-01-01T00:00:00Z`,
      normalizedAfter: `${year}-01-01`,
      normalizedBefore: `${year}-12-31`,
    };
  }

  if (!publishedAfter || !publishedBefore) {
    const error = new Error('게시 시점 직접 설정은 시작일과 종료일을 모두 입력해야 합니다.');
    error.statusCode = 400;
    error.code = 'INVALID_PUBLISHED_RANGE';
    throw error;
  }

  const startDate = parseDateInput(publishedAfter, '시작일');
  const endDate = parseDateInput(publishedBefore, '종료일');

  if (startDate > endDate) {
    const error = new Error('시작일은 종료일보다 늦을 수 없습니다.');
    error.statusCode = 400;
    error.code = 'INVALID_PUBLISHED_RANGE';
    throw error;
  }

  return {
    publishedAfter: startDate.toISOString(),
    publishedBefore: addDays(endDate, 1).toISOString(),
    normalizedAfter: formatDateInput(startDate),
    normalizedBefore: formatDateInput(endDate),
  };
}

export async function searchYoutubeCandidates(query, { countryCode, publishedAfter, publishedBefore, publishedYear }) {
  const apiKey = ensureApiKey();
  const range = buildPublishedRange({ publishedAfter, publishedBefore, publishedYear });
  const normalizedCountryCode = countryCode && countryCode !== 'GLOBAL' ? countryCode : null;
  const relevanceLanguage = normalizedCountryCode
    ? COUNTRY_LANGUAGE_MAP[normalizedCountryCode] || undefined
    : undefined;

  try {
    const searchRes = await youtubeClient.get('/search', {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'viewCount',
        maxResults: 50,
        key: apiKey,
        regionCode: normalizedCountryCode || undefined,
        relevanceLanguage,
        publishedAfter: range.publishedAfter,
        publishedBefore: range.publishedBefore,
      },
    });

    const items = searchRes.data.items || [];
    if (items.length === 0) {
      return [];
    }

    const videoIds = items.map((item) => item.id.videoId).join(',');
    const videoRes = await youtubeClient.get('/videos', {
      params: {
        part: 'snippet,statistics,contentDetails,status',
        id: videoIds,
        key: apiKey,
      },
    });

    return (videoRes.data.items || []).map((video) => ({
      videoId: video.id,
      title: video.snippet.title,
      description: video.snippet.description || '',
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      thumbnail:
        video.snippet.thumbnails.high?.url ||
        video.snippet.thumbnails.medium?.url ||
        video.snippet.thumbnails.default?.url ||
        '',
      viewCount: Number(video.statistics.viewCount || 0),
      likeCount: Number(video.statistics.likeCount || 0),
      commentCount: Number(video.statistics.commentCount || 0),
      duration: video.contentDetails.duration,
      privacyStatus: video.status?.privacyStatus || 'public',
      embeddable: video.status?.embeddable !== false,
      madeForKids: Boolean(video.status?.madeForKids),
      liveBroadcastContent: video.snippet.liveBroadcastContent || 'none',
    }));
  } catch (error) {
    throw parseYouTubeError(error);
  }
}

export async function fetchVideoComments(videoId, maxPages = 5) {
  const apiKey = ensureApiKey();
  const comments = [];
  let pageToken = undefined;
  let pageCount = 0;
  let disabled = false;

  while (pageCount < maxPages) {
    try {
      const res = await youtubeClient.get('/commentThreads', {
        params: {
          part: 'snippet',
          videoId,
          maxResults: 100,
          order: 'relevance',
          key: apiKey,
          textFormat: 'plainText',
          pageToken,
        },
      });

      const items = res.data.items || [];
      items.forEach((item) => {
        const snippet = item.snippet.topLevelComment.snippet;
        comments.push({
          commentId: item.id,
          author: snippet.authorDisplayName,
          text: snippet.textDisplay,
          likeCount: Number(snippet.likeCount || 0),
          publishedAt: snippet.publishedAt,
        });
      });

      pageCount += 1;
      pageToken = res.data.nextPageToken;
      if (!pageToken) {
        break;
      }
    } catch (error) {
      const reason = error.response?.data?.error?.errors?.[0]?.reason;
      if (error.response?.status === 403 && reason === 'commentsDisabled') {
        disabled = true;
        break;
      }
      throw parseYouTubeError(error);
    }
  }

  return {
    comments,
    disabled,
    pagesFetched: pageCount,
  };
}
