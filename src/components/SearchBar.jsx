import { useState } from 'react';
import { Search, X } from 'lucide-react';

const COUNTRY_OPTIONS = [
  { value: 'KR', label: '대한민국' },
  { value: 'US', label: '미국' },
  { value: 'JP', label: '일본' },
  { value: 'TW', label: '대만' },
  { value: 'SG', label: '싱가포르' },
  { value: 'GLOBAL', label: '글로벌' },
];

const DATE_PRESET_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: '1M', label: '1개월' },
  { value: '3M', label: '3개월' },
  { value: '6M', label: '6개월' },
  { value: '1Y', label: '1년' },
  { value: 'CUSTOM', label: '직접 설정' },
];

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function subtractMonths(date, months) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() - months);
  return nextDate;
}

function buildPresetRange(preset) {
  const today = new Date();
  const endDate = formatDateInput(today);

  if (preset === 'ALL') {
    return {
      publishedAfter: null,
      publishedBefore: null,
      publishedRangeLabel: '전체',
    };
  }

  if (preset === '1M') {
    return {
      publishedAfter: formatDateInput(subtractMonths(today, 1)),
      publishedBefore: endDate,
      publishedRangeLabel: '최근 1개월',
    };
  }

  if (preset === '3M') {
    return {
      publishedAfter: formatDateInput(subtractMonths(today, 3)),
      publishedBefore: endDate,
      publishedRangeLabel: '최근 3개월',
    };
  }

  if (preset === '6M') {
    return {
      publishedAfter: formatDateInput(subtractMonths(today, 6)),
      publishedBefore: endDate,
      publishedRangeLabel: '최근 6개월',
    };
  }

  if (preset === '1Y') {
    return {
      publishedAfter: formatDateInput(subtractMonths(today, 12)),
      publishedBefore: endDate,
      publishedRangeLabel: '최근 1년',
    };
  }

  return {
    publishedAfter: null,
    publishedBefore: null,
    publishedRangeLabel: '직접 설정',
  };
}

/**
 * SearchBar 컴포넌트
 * 검색어 입력 및 검색 실행 UI
 */
export default function SearchBar({ onSearch, isLoading }) {
  const [query, setQuery] = useState('');
  const [countryCode, setCountryCode] = useState('KR');
  const [publishedPreset, setPublishedPreset] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const rangeError =
    publishedPreset === 'CUSTOM'
      ? !customStartDate || !customEndDate
        ? '시작일과 종료일을 모두 입력해 주세요.'
        : customStartDate > customEndDate
          ? '시작일은 종료일보다 늦을 수 없습니다.'
          : ''
      : '';

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading || rangeError) return;

    const presetRange = buildPresetRange(publishedPreset);
    const filters =
      publishedPreset === 'CUSTOM'
        ? {
            countryCode,
            publishedPreset,
            publishedAfter: customStartDate,
            publishedBefore: customEndDate,
            publishedRangeLabel: `${customStartDate} ~ ${customEndDate}`,
          }
        : {
            countryCode,
            publishedPreset,
            ...presetRange,
          };

    onSearch(trimmed, {
      ...filters,
    });
  };

  const handleClear = () => {
    setQuery('');
  };

  const handleSelectPreset = (preset) => {
    setPublishedPreset(preset);

    if (preset === 'CUSTOM' && (!customStartDate || !customEndDate)) {
      const today = new Date();
      setCustomEndDate(formatDateInput(today));
      setCustomStartDate(formatDateInput(subtractMonths(today, 1)));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <div className="relative flex-1">
          {/* 검색 아이콘 */}
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-yt-subtext pointer-events-none"
            size={20}
          />

          {/* 입력창 */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="YouTube 검색어를 입력하세요 (예: 인공지능, K-pop, 요리)"
            className="w-full bg-yt-surface border border-yt-border rounded-l-full pl-12 pr-10 py-3 text-yt-text placeholder-yt-subtext text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            disabled={isLoading}
            autoFocus
          />

          {/* 클리어 버튼 */}
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-yt-subtext hover:text-yt-text transition-colors p-1 rounded-full hover:bg-yt-border"
              aria-label="검색어 지우기"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 검색 버튼 */}
        <button
          type="submit"
          disabled={!query.trim() || isLoading || Boolean(rangeError)}
          className="bg-yt-surface border border-l-0 border-yt-border rounded-r-full px-6 py-3 text-yt-text hover:bg-yt-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-yt-subtext border-t-white rounded-full animate-spin" />
              <span>검색 중</span>
            </>
          ) : (
            <>
              <Search size={16} />
              <span>검색</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[196px_minmax(0,1fr)]">
        <label className="block sm:w-[196px] sm:flex-none">
          <span className="block text-yt-subtext text-xs mb-1.5">국가 필터</span>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            disabled={isLoading}
            className="w-full bg-yt-surface border border-yt-border rounded-xl px-3 py-2.5 text-yt-text text-sm focus:outline-none focus:border-blue-500"
          >
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="block">
          <span className="block text-yt-subtext text-xs mb-1.5">게시 시점 필터</span>

          <div className="rounded-xl border border-yt-border bg-yt-surface px-3 py-3">
            <div className="flex flex-wrap gap-2">
              {DATE_PRESET_OPTIONS.map((option) => {
                const isActive = publishedPreset === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectPreset(option.value)}
                    disabled={isLoading}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/15 text-blue-100'
                        : 'border-yt-border bg-yt-card text-yt-subtext hover:text-yt-text'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {publishedPreset === 'CUSTOM' && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-yt-card border border-yt-border rounded-xl px-3 py-2.5 text-yt-text text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-center text-yt-subtext text-xs">~</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-yt-card border border-yt-border rounded-xl px-3 py-2.5 text-yt-text text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <p className="mt-2 text-[11px] leading-5 text-yt-subtext">
              프리셋과 직접 설정은 하나만 적용됩니다. 직접 설정은 시작일과 종료일을 모두 입력해야
              합니다.
            </p>

            {rangeError && (
              <p className="mt-1 text-[11px] text-amber-300">{rangeError}</p>
            )}
          </div>
        </div>
      </div>

      {/* 검색 팁 */}
      <p className="text-center text-yt-subtext text-xs mt-2">
        유효 영상 필터링 후 조회수 상위 9개 영상의 반응을 분석합니다
      </p>

      {isLoading && (
        <p className="text-center text-blue-300 text-xs mt-1">
          검색이 시작되었습니다. 후보 영상 수집, 댓글 선별, 반응 분석까지 보통 20~40초 내외가
          소요될 수 있습니다.
        </p>
      )}
    </form>
  );
}
