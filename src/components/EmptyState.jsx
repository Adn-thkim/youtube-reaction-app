import { SearchX, WifiOff, AlertTriangle, Youtube } from 'lucide-react';

/**
 * EmptyState 컴포넌트
 * 검색 결과 없음, API 에러, 할당량 초과 등 다양한 빈 상태 처리
 */
export default function EmptyState({ type = 'empty', query = '', errorMessage = '' }) {
  const configs = {
    // 첫 방문 (검색 전)
    initial: {
      Icon: Youtube,
      iconClass: 'text-yt-red',
      title: 'YouTube 반응 수집기',
      description: '검색어를 입력하면 조회수 상위 9개 영상의 댓글 감정을 자동으로 분석합니다.',
    },

    // 검색 결과 없음
    empty: {
      Icon: SearchX,
      iconClass: 'text-yt-subtext',
      title: `"${query}"에 대한 결과가 없습니다`,
      description: '다른 검색어를 시도해 보거나 더 일반적인 키워드를 사용해 보세요.',
    },

    // API 할당량 초과
    quota: {
      Icon: AlertTriangle,
      iconClass: 'text-yellow-500',
      title: 'YouTube API 일일 할당량 초과',
      description: '오늘의 YouTube Data API 요청 한도에 도달했습니다. 내일 UTC 00:00 이후 다시 이용 가능합니다. 캐시된 데이터가 있는 검색어는 계속 조회 가능합니다.',
    },

    // 네트워크/서버 에러
    error: {
      Icon: WifiOff,
      iconClass: 'text-red-500',
      title: '연결 오류가 발생했습니다',
      description: errorMessage || '네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.',
    },
  };

  const { Icon, iconClass, title, description } = configs[type] || configs.empty;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4 animate-fade-in">
      <div className={`mb-5 ${iconClass}`}>
        <Icon size={56} strokeWidth={1.2} />
      </div>
      <h2 className="text-yt-text text-xl font-semibold mb-2">{title}</h2>
      <p className="text-yt-subtext text-sm max-w-md leading-relaxed">{description}</p>

      {/* 검색 팁 - initial 상태에서만 표시 */}
      {type === 'initial' && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg">
          {['K-pop', '인공지능', '요리 레시피', '영화 리뷰'].map((suggestion) => (
            <span
              key={suggestion}
              className="px-3 py-2 bg-yt-card border border-yt-border rounded-lg text-yt-subtext text-xs hover:text-yt-text hover:border-yt-subtext cursor-default transition-colors"
            >
              {suggestion}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
