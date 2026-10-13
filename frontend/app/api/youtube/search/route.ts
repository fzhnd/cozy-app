import { NextResponse } from 'next/server';

export interface YouTubeSearchResult {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  views: string;
  timeAgo: string;
  duration: string;
  thumbnail: string;
}

// Curated popular videos covering various topics for graceful fallback
const CURATED_TOPIC_VIDEOS: Record<string, YouTubeSearchResult[]> = {
  music: [
    {
      id: 'yt-music-1',
      videoId: 'kJQP7kiw5Fk',
      title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
      channel: 'Luis Fonsi',
      views: '8.4B views',
      timeAgo: '7 years ago',
      duration: '4:42',
      thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg'
    },
    {
      id: 'yt-music-2',
      videoId: 'JGwWNGJdvx8',
      title: 'Ed Sheeran - Shape of You (Official Music Video)',
      channel: 'Ed Sheeran',
      views: '6.2B views',
      timeAgo: '6 years ago',
      duration: '4:24',
      thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg'
    },
    {
      id: 'yt-music-3',
      videoId: '9bZkp7q19f0',
      title: 'PSY - GANGNAM STYLE(강남스타일) M/V',
      channel: 'officialpsy',
      views: '5.1B views',
      timeAgo: '11 years ago',
      duration: '4:13',
      thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg'
    }
  ],
  lofi: [
    {
      id: 'yt-lofi-1',
      videoId: 'jfKfPfyJRdk',
      title: 'lofi hip hop radio - beats to relax/study to',
      channel: 'Lofi Girl',
      views: '68M views',
      timeAgo: 'Live Now',
      duration: 'LIVE',
      thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg'
    },
    {
      id: 'yt-lofi-2',
      videoId: '4xDzrJKXOOY',
      title: 'synthwave radio - chill synth / retro beats',
      channel: 'Lofi Girl',
      views: '12M views',
      timeAgo: 'Live Now',
      duration: 'LIVE',
      thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg'
    }
  ],
  gaming: [
    {
      id: 'yt-game-1',
      videoId: 'L_LUpnjgPso',
      title: 'Lethal Company - Terrifying Escapes with Friends',
      channel: 'Mob Entertainment',
      views: '3.1M views',
      timeAgo: '3 days ago',
      duration: '14:20',
      thumbnail: 'https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg'
    },
    {
      id: 'yt-game-2',
      videoId: 'fJ9rUzIMcZQ',
      title: 'We tried NEW Backrooms games...',
      channel: 'SMii7Y',
      views: '2.2M views',
      timeAgo: '1 day ago',
      duration: '36:26',
      thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg'
    }
  ]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || !q.trim()) {
    return NextResponse.json({ videos: [] });
  }

  const query = q.trim();

  // Attempt 1: Fetch directly from YouTube search results and parse ytInitialData
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      next: { revalidate: 120 }
    });

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/) ||
                    html.match(/var ytInitialData\s*=\s*({.+?});/);

      if (match && match[1]) {
        const data = JSON.parse(match[1]);
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

        const videos: YouTubeSearchResult[] = [];

        if (Array.isArray(contents)) {
          for (const section of contents) {
            const itemContents = section?.itemSectionRenderer?.contents;
            if (Array.isArray(itemContents)) {
              for (const item of itemContents) {
                const vid = item?.videoRenderer;
                if (vid && vid.videoId && vid.title?.runs?.[0]?.text) {
                  const videoId = vid.videoId;
                  const title = vid.title.runs.map((r: any) => r.text).join('');
                  const channel = vid.ownerText?.runs?.[0]?.text || vid.shortBylineText?.runs?.[0]?.text || 'YouTube Channel';
                  const views = vid.viewCountText?.simpleText || vid.shortViewCountText?.simpleText || 'Views';
                  const timeAgo = vid.publishedTimeText?.simpleText || '';
                  const duration = vid.lengthText?.simpleText || '';
                  
                  const thumbnails = vid.thumbnail?.thumbnails || [];
                  const thumbnail = thumbnails.length > 0 
                    ? thumbnails[thumbnails.length - 1].url 
                    : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

                  videos.push({
                    id: `yt-${videoId}`,
                    videoId,
                    title,
                    channel,
                    views,
                    timeAgo,
                    duration,
                    thumbnail
                  });

                  if (videos.length >= 20) break;
                }
              }
            }
            if (videos.length >= 20) break;
          }
        }

        if (videos.length > 0) {
          return NextResponse.json({ videos });
        }
      }
    }
  } catch (err) {
    console.warn('YouTube direct scrape failed, falling back:', err);
  }

  // Attempt 2: Try Invidious public mirror
  try {
    const invidiousInstances = [
      'https://inv.nadeko.net',
      'https://invidious.nerdvpn.de',
      'https://yewtu.be'
    ];

    for (const host of invidiousInstances) {
      try {
        const invRes = await fetch(`${host}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
          signal: AbortSignal.timeout(3000)
        });
        if (invRes.ok) {
          const items = await invRes.json();
          if (Array.isArray(items) && items.length > 0) {
            const videos: YouTubeSearchResult[] = items.slice(0, 20).map((v: any) => ({
              id: `yt-${v.videoId}`,
              videoId: v.videoId,
              title: v.title,
              channel: v.author,
              views: v.viewCount ? `${(v.viewCount / 1000).toFixed(0)}K views` : 'Views',
              timeAgo: v.publishedText || '',
              duration: v.lengthSeconds ? `${Math.floor(v.lengthSeconds / 60)}:${String(v.lengthSeconds % 60).padStart(2, '0')}` : '',
              thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
            }));

            return NextResponse.json({ videos });
          }
        }
      } catch {
        // Continue to next mirror
      }
    }
  } catch (err) {
    console.warn('Invidious fallback failed:', err);
  }

  // Attempt 3: Intelligent dynamic fallback matching topic or search embed
  const lowerQ = query.toLowerCase();
  for (const [topic, topicVideos] of Object.entries(CURATED_TOPIC_VIDEOS)) {
    if (lowerQ.includes(topic)) {
      return NextResponse.json({ videos: topicVideos });
    }
  }

  // Construct search-embed fallback video that leverages YouTube's listType=search
  const dynamicFallback: YouTubeSearchResult[] = [
    {
      id: `yt-search-${Date.now()}`,
      videoId: `__search__:${query}`,
      title: `${query} (YouTube Top Result)`,
      channel: 'YouTube Search',
      views: 'Search Match',
      timeAgo: 'Top Result',
      duration: 'Video',
      thumbnail: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&auto=format&fit=crop&q=80`
    }
  ];

  return NextResponse.json({ videos: dynamicFallback });
}
