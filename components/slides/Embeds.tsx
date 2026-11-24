import type { IframeSlide, YoutubeSlide, ImageSlide, MessageSlide } from "@/lib/types";

export function IframeView({ slide }: { slide: IframeSlide }) {
  if (!slide.url)
    return (
      <div className="status setup">
        <h2>{slide.title}: ikke koblet til ennå</h2>
        <p>
          Lim inn en innebyggings-lenke i {slide.urlEnv ?? "url"} (Power BI: Fil → Bygg inn rapport → Publiser på nett).
        </p>
      </div>
    );
  return (
    <div className="frame">
      <iframe src={slide.url} title={slide.title} allowFullScreen />
    </div>
  );
}

export function YoutubeView({ slide }: { slide: YoutubeSlide }) {
  const common = "autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&loop=1";
  const src = slide.playlistId
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${slide.playlistId}&${common}`
    : slide.videoId
      ? `https://www.youtube-nocookie.com/embed/${slide.videoId}?${common}&playlist=${slide.videoId}`
      : null;
  if (!src)
    return (
      <div className="status setup">
        <h2>YouTube: ikke koblet til ennå</h2>
        <p>Legg inn video-ID (eller spilleliste-ID som starter med PL) i {slide.videoIdEnv ?? "videoId"}.</p>
      </div>
    );
  return (
    <div className="yt">
      <iframe src={src} title="YouTube" allow="autoplay; encrypted-media" allowFullScreen />
    </div>
  );
}

export function ImageView({ slide }: { slide: ImageSlide }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="fullimg" src={slide.src} alt={slide.alt ?? ""} />;
}

export function MessageView({ slide }: { slide: MessageSlide }) {
  return (
    <div className="message">
      <h1>{slide.heading}</h1>
      {slide.text && <p>{slide.text}</p>}
    </div>
  );
}
