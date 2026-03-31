import React, { useState } from 'react';
import type { Webcam } from '../../hooks/useWebcams';

interface WebcamStripProps {
  webcams: Webcam[];
}

const WebcamModal: React.FC<{ webcam: Webcam; onClose: () => void }> = ({ webcam, onClose }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      zIndex: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
    onClick={onClose}
  >
    <div
      style={{
        width: 560,
        background: '#0a0f1a',
        border: '1px solid #1a2d44',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid #1a2d44',
      }}>
        <span style={{ fontFamily: 'var(--font-header)', fontSize: 11, color: '#aac4dc', fontWeight: 700, letterSpacing: '0.06em' }}>
          {webcam.title.toUpperCase()}{webcam.city ? ` — ${webcam.city}` : ''}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#aac4dc', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
        >
          ✕
        </button>
      </div>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
        <iframe
          src={webcam.embed}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          title={webcam.title}
        />
      </div>
    </div>
  </div>
);

const WebcamThumb: React.FC<{ webcam: Webcam; onClick: () => void }> = ({ webcam, onClick }) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      onClick={onClick}
      title={`${webcam.title}${webcam.city ? ` — ${webcam.city}` : ''}`}
      style={{
        flexShrink: 0,
        width: 120,
        height: 72,
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid #1a2d44',
        background: '#0a0f1a',
        cursor: 'pointer',
        padding: 0,
        position: 'relative',
      }}
    >
      {!imgErr && webcam.thumbnail ? (
        <img
          src={webcam.thumbnail}
          alt={webcam.title}
          onError={() => setImgErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#1a2d44', fontSize: 22,
        }}>
          📷
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.65)',
        padding: '2px 5px',
        fontFamily: 'var(--font-body)',
        fontSize: 8,
        color: '#aac4dc',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'left',
      }}>
        {webcam.city || webcam.title}
      </div>
      <div style={{
        position: 'absolute', top: 4, right: 4,
        width: 6, height: 6, borderRadius: '50%',
        background: '#ff2020',
        boxShadow: '0 0 4px #ff2020',
      }} />
    </button>
  );
};

export const WebcamStrip: React.FC<WebcamStripProps> = ({ webcams }) => {
  const [activeWebcam, setActiveWebcam] = useState<Webcam | null>(null);

  if (webcams.length === 0) return null;

  return (
    <>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: '8px 10px',
        background: 'linear-gradient(to top, rgba(10,15,26,0.92) 0%, rgba(10,15,26,0.0) 100%)',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        overflowX: 'auto',
        pointerEvents: 'auto',
      }}>
        <div style={{
          fontFamily: 'var(--font-header)',
          fontSize: 9,
          color: '#aac4dc',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          flexShrink: 0,
          alignSelf: 'center',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          marginRight: 2,
        }}>
          Live Cams
        </div>
        {webcams.map(w => (
          <WebcamThumb key={w.id} webcam={w} onClick={() => setActiveWebcam(w)} />
        ))}
      </div>

      {activeWebcam && (
        <WebcamModal webcam={activeWebcam} onClose={() => setActiveWebcam(null)} />
      )}
    </>
  );
};

export default WebcamStrip;
