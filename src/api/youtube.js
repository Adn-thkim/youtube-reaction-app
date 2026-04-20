import axios from 'axios';
import { getCache, setCache, getSearchCacheKey } from '../utils/cache';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 1000 * 60 * 10,
});

function parseApiError(error) {
  if (error.response) {
    return {
      code: error.response.data?.code || 'API_ERROR',
      message: error.response.data?.message || '서버 요청 처리 중 오류가 발생했습니다.',
      details: error.response.data?.details || null,
    };
  }

  if (error.code === 'ECONNABORTED') {
    return {
      code: 'TIMEOUT',
      message: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
    };
  }

  return {
    code: 'UNKNOWN',
    message: error.message || '알 수 없는 오류가 발생했습니다.',
  };
}

export async function searchVideos(query, filters) {
  if (!query || !query.trim()) {
    throw { code: 'EMPTY_QUERY', message: '검색어를 입력해 주세요.' };
  }

  const cacheKey = getSearchCacheKey(query, filters);
  const cachedData = getCache(cacheKey);

  if (cachedData) {
    return { result: cachedData, fromCache: true };
  }

  try {
    const response = await apiClient.post('/api/search', {
      query,
      countryCode: filters.countryCode,
      publishedPreset: filters.publishedPreset || 'ALL',
      publishedAfter: filters.publishedAfter || null,
      publishedBefore: filters.publishedBefore || null,
      publishedRangeLabel: filters.publishedRangeLabel || '전체',
    });

    setCache(cacheKey, response.data);
    return {
      result: response.data,
      fromCache: false,
    };
  } catch (error) {
    throw parseApiError(error);
  }
}

export function formatViewCount(count) {
  if (count >= 100000000) return `${(count / 100000000).toFixed(1)}억`;
  if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}천`;
  return Number(count || 0).toLocaleString('ko-KR');
}

export function formatRelativeTime(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < week) return `${Math.floor(diff / day)}일 전`;
  if (diff < month) return `${Math.floor(diff / week)}주 전`;
  if (diff < year) return `${Math.floor(diff / month)}개월 전`;
  return `${Math.floor(diff / year)}년 전`;
}
