import { useCallback, useEffect, useRef, useState } from 'react';
import { Database, RefreshCw, Youtube } from 'lucide-react';
import SearchBar from './components/SearchBar';
import VideoGrid from './components/VideoGrid';
import LoadingSkeleton from './components/LoadingSkeleton';
import EmptyState from './components/EmptyState';
import { searchVideos } from './api/youtube';
import { clearCache, getCacheRemainingTime, getSearchCacheKey } from './utils/cache';

export default function App() {
  const [result, setResult] = useState(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState({
    countryCode: 'KR',
    publishedPreset: 'ALL',
    publishedAfter: null,
    publishedBefore: null,
    publishedRangeLabel: '전체',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [appState, setAppState] = useState('initial');
  const [errorMessage, setErrorMessage] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const [cacheMinutes, setCacheMinutes] = useState(null);
  const [loadingElapsedSeconds, setLoadingElapsedSeconds] = useState(0);

  const abortRef = useRef(null);

  useEffect(() => {
    if (!isLoading) {
      setLoadingElapsedSeconds(0);
      return undefined;
    }

    const startedAt = Date.now();
    setLoadingElapsedSeconds(0);

    const intervalId = window.setInterval(() => {
      setLoadingElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isLoading]);

  const handleSearch = useCallback(async (query, filters) => {
    if (abortRef.current) {
      abortRef.current.cancelled = true;
    }

    const request = { cancelled: false };
    abortRef.current = request;

    setIsLoading(true);
    setAppState('loading');
    setCurrentQuery(query);
    setCurrentFilters(filters);
    setResult(null);
    setErrorMessage('');
    setFromCache(false);

    try {
      const { result: searchResult, fromCache: cached } = await searchVideos(query, filters);

      if (request.cancelled) return;

      if (!searchResult.videos?.length) {
        setResult(searchResult);
        setAppState('empty');
      } else {
        setResult(searchResult);
        setFromCache(cached);
        setAppState('results');

        if (cached) {
          const cacheKey = getSearchCacheKey(query, filters);
          setCacheMinutes(getCacheRemainingTime(cacheKey));
        }
      }
    } catch (error) {
      if (request.cancelled) return;
      setAppState('error');
      setErrorMessage(error.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      if (!request.cancelled) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleCacheRefresh = () => {
    if (!currentQuery) return;
    const cacheKey = getSearchCacheKey(currentQuery, currentFilters);
    clearCache(cacheKey);
    handleSearch(currentQuery, currentFilters);
  };

  return (
    <div className="min-h-screen bg-yt-dark">
      <header className="sticky top-0 z-10 bg-yt-dark/95 backdrop-blur-sm border-b border-yt-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Youtube className="text-yt-red" size={28} />
            <h1 className="text-yt-text text-xl font-bold tracking-tight">
              YouTube 반응 수집기
            </h1>
          </div>

          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {appState === 'results' && fromCache && (
          <div className="flex items-center justify-between bg-blue-950/50 border border-blue-800 rounded-lg px-4 py-2.5 mb-5 text-sm">
            <div className="flex items-center gap-2 text-blue-300">
              <Database size={14} />
              <span>
                캐시된 결과를 표시하고 있습니다
                {cacheMinutes && ` (유효 기간: 약 ${cacheMinutes}분 남음)`}
              </span>
            </div>
            <button
              onClick={handleCacheRefresh}
              disabled={isLoading}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-200 transition-colors text-xs"
            >
              <RefreshCw size={13} />
              <span>새로고침</span>
            </button>
          </div>
        )}

        {appState === 'initial' && <EmptyState type="initial" />}
        {appState === 'loading' && (
          <LoadingSkeleton query={currentQuery} elapsedSeconds={loadingElapsedSeconds} />
        )}
        {appState === 'results' && result && (
          <VideoGrid
            videos={result.videos}
            query={currentQuery}
            filters={result.filters}
            meta={result.meta}
            aggregateAnalysis={result.aggregateAnalysis}
          />
        )}
        {appState === 'empty' && <EmptyState type="empty" query={currentQuery} />}
        {appState === 'error' && <EmptyState type="error" errorMessage={errorMessage} />}
      </main>

      <footer className="border-t border-yt-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-yt-subtext text-xs space-y-1">
          <p>로컬 서버 기반 YouTube 수집 · Claude CLI 연동 구조</p>
          <p>영상별 분석 + 검색어 기준 종합 요약을 함께 제공합니다</p>
        </div>
      </footer>
    </div>
  );
}
