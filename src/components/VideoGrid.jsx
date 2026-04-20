import VideoCard from './VideoCard';
import AggregateSummary from './AggregateSummary';

/**
 * VideoGrid 컴포넌트
 * 3x3 반응형 그리드 레이아웃으로 VideoCard 목록 렌더링
 */
export default function VideoGrid({ videos, query, filters, meta, aggregateAnalysis }) {
  return (
    <div className="animate-fade-in">
      {/* 결과 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-yt-subtext text-sm">
          <span className="text-yt-text font-medium">"{query}"</span>
          {' '}검색 결과 · 유효 영상{' '}
          <span className="text-yt-text font-medium">{videos.length}개</span>
        </p>
      </div>

      <AggregateSummary
        aggregateAnalysis={aggregateAnalysis}
        filters={filters}
        meta={meta}
      />

      {/* 3열 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <VideoCard
            key={video.videoId}
            video={video}
          />
        ))}
      </div>
    </div>
  );
}
