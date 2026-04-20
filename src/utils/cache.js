/**
 * localStorage 기반 캐싱 유틸리티
 * Quota 최적화를 위해 YouTube API 응답을 24시간 캐싱합니다.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

/**
 * 캐시에 데이터 저장
 * @param {string} key - 캐시 키
 * @param {any} data - 저장할 데이터
 */
export function setCache(key, data) {
  try {
    const payload = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    // localStorage 용량 초과 또는 시크릿 모드 등 예외 처리
    console.warn('[Cache] 캐시 저장 실패:', error.message);
  }
}

/**
 * 캐시에서 데이터 조회 (TTL 만료 시 null 반환)
 * @param {string} key - 캐시 키
 * @returns {any|null} 유효한 캐시 데이터 또는 null
 */
export function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const { data, timestamp } = JSON.parse(raw);
    const isExpired = Date.now() - timestamp > CACHE_TTL_MS;

    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[Cache] 캐시 조회 실패:', error.message);
    return null;
  }
}

/**
 * 특정 캐시 키 삭제
 * @param {string} key - 캐시 키
 */
export function clearCache(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('[Cache] 캐시 삭제 실패:', error.message);
  }
}

/**
 * 검색어 기반 캐시 키 생성
 * @param {string} query - 검색어
 * @returns {string} 캐시 키
 */
export function getSearchCacheKey(query, filters = {}) {
  const countryCode = filters.countryCode || 'GLOBAL';
  const publishedPreset = filters.publishedPreset || 'ALL';
  const publishedAfter = filters.publishedAfter || 'NONE';
  const publishedBefore = filters.publishedBefore || 'NONE';
  return `yt_cache_${query.toLowerCase().trim()}_${countryCode}_${publishedPreset}_${publishedAfter}_${publishedBefore}`;
}

/**
 * 댓글 캐시 키 생성
 * @param {string} videoId - YouTube 동영상 ID
 * @returns {string} 캐시 키
 */
export function getCommentsCacheKey(videoId) {
  return `yt_comments_${videoId}`;
}

/**
 * 캐시 남은 유효 시간 반환 (분 단위)
 * @param {string} key - 캐시 키
 * @returns {number|null} 남은 시간(분) 또는 null
 */
export function getCacheRemainingTime(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { timestamp } = JSON.parse(raw);
    const elapsed = Date.now() - timestamp;
    const remaining = CACHE_TTL_MS - elapsed;
    return remaining > 0 ? Math.ceil(remaining / 60000) : null;
  } catch {
    return null;
  }
}
