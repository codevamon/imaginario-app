// src/modules/bird/widgets/InterviewsWidget.tsx
import React from "react";
import { IonIcon, IonSpinner } from "@ionic/react";
import { play, pause } from "ionicons/icons";
import { audioManager } from "@/core/audio/player";
import { useAudioLoading } from "@/core/audio/useAudioLoading";
import { useAudioRepairing } from "@/core/audio/useAudioRepairing";
import { useAudioProgress } from "@/core/audio/useAudioProgress";
import type { Interview } from "@/core/db/dao/interviews";

type Props = {
  items: Interview[];
  title?: string;
};

const InterviewsWidget: React.FC<Props> = ({ items, title = "" }) => {
  const [playingId, setPlayingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = audioManager.onChange((id) => setPlayingId(id));
    setPlayingId(audioManager.getPlayingId());
    return unsub;
  }, []);

  const handleClick = (id: string, url?: string) => {
    const item = items.find((i) => i.id === id);
    const resolved = url || item?.audio_url;
    if (resolved) audioManager.toggle(id, resolved);
  };

  return (
    <div className="tracks-widget-i">
      {title && <h3 className="widget-title">{title}</h3>}

      <ul className="track-list-i">
        {items.map((interview) => {
          const isPlaying = playingId === interview.id;
          const loading = useAudioLoading(interview.id);
          const repairing = useAudioRepairing(interview.id);
          const { progress } = useAudioProgress(isPlaying);

          return (
            <li
              key={interview.id}
              className="track-card-i _flex"
              onClick={() => handleClick(interview.id, interview.audio_url!)}
            >
              <button
                className="track-card-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick(interview.id, interview.audio_url!);
                }}
              >
                {repairing ? (
                  <IonSpinner style={{ width: 16, height: 16, color: "#f59e0b" }} />
                ) : loading ? (
                  <IonSpinner style={{ width: 24, height: 24 }} />
                ) : (
                  <IonIcon icon={isPlaying ? pause : play} className="track-icon" />
                )}
              </button>

              <div className="track-card-info">
                <div className="in-track-card-info">
                  <div className="track-card-title">
                    {interview.title || "Entrevista"}
                  </div>
                </div>

                <div className={`track-card-accordion ${isPlaying ? "open" : ""}`}>
                  <div className="in-track-card-progress">
                    <div className="track-progress-bar">
                      <div
                        className="track-progress-fill"
                        style={{ width: `${progress.toFixed(2)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default InterviewsWidget;
