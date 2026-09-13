import { useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { C, SHADOW, RADIUS, BUTTON } from '../constants.js';
import { ErrorBanner } from './ErrorBanner.jsx';

export function PhotoSlot({ photo, compact, locked }) {
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  if (!photo.rawImage) {
    return (
      <div>
        <div
          role="button"
          tabIndex={0}
          aria-label="Kombin fotoğrafı yükle: sürükleyip bırakın veya seçin"
          onClick={() => galleryRef.current && galleryRef.current.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              galleryRef.current && galleryRef.current.click();
            }
          }}
          onDragEnter={photo.onZoneDragEnter}
          onDragOver={photo.onZoneDragOver}
          onDragLeave={photo.onZoneDragLeave}
          onDrop={photo.onZoneDrop}
          className={`flex flex-col items-center justify-center text-center cursor-pointer ${compact ? 'px-4 py-10' : 'px-6 py-24'}`}
          style={{
            background: photo.isDragOver ? C.surfaceSubtle : 'transparent',
            borderRadius: RADIUS.large,
            border: `1.5px dashed ${photo.isDragOver ? C.accent : C.borderSubtle}`,
            transform: photo.isDragOver ? 'scale(1.005)' : 'scale(1)',
            transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
          }}
        >
          <div
            className={compact ? 'rounded-full flex items-center justify-center mb-3' : 'rounded-full flex items-center justify-center mb-6'}
            style={{
              width: compact ? 48 : 64, height: compact ? 48 : 64,
              background: C.surface,
              color: C.accent,
              transform: photo.isDragOver ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <Upload size={compact ? 18 : 24} strokeWidth={1.6} />
          </div>
          <p className="font-display" style={{ fontSize: compact ? 16 : 22, fontWeight: 600, color: C.textPrimary, marginBottom: compact ? 4 : 8 }}>
            {photo.isDragOver ? 'Bırakın…' : 'Kombinini Göster'}
          </p>
          {!compact && (
            <p className="font-sans" style={{ fontSize: 14.5, color: C.textSecondary, marginBottom: 28, maxWidth: 300, lineHeight: 1.5 }}>
              Kombinin net görünen, tam boy veya üst gövde fotoğrafı en iyi sonucu verir.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => cameraRef.current && cameraRef.current.click()}
              className="press-btn flex items-center gap-2 font-sans font-semibold"
              style={{ fontSize: compact ? 12.5 : 14, borderRadius: RADIUS.medium, padding: compact ? '9px 14px' : '13px 20px', ...BUTTON.secondary() }}
            >
              <Camera size={compact ? 14 : 17} /> {compact ? 'Çek' : 'Fotoğraf Çek'}
            </button>
            <button
              onClick={() => galleryRef.current && galleryRef.current.click()}
              className="press-btn flex items-center gap-2 font-sans font-semibold"
              style={{ fontSize: compact ? 12.5 : 14, borderRadius: RADIUS.medium, padding: compact ? '9px 14px' : '13px 20px', ...BUTTON.primary() }}
            >
              <Upload size={compact ? 14 : 17} /> {compact ? 'Seç' : 'Galeriden Seç'}
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={photo.onPick} className="hidden" />
          <input ref={galleryRef} type="file" accept="image/*" onChange={photo.onPick} className="hidden" />
          {!compact && (
            <p className="font-sans" style={{ fontSize: 11.5, color: C.textMuted, marginTop: 22, maxWidth: 300, lineHeight: 1.6 }}>
              Yüzün otomatik olarak bulanıklaştırılır; orijinal fotoğraf hiçbir yere gönderilmez, sadece bulanıklaştırılmış hâli kıyafet analizi için paylaşılır.
            </p>
          )}
        </div>
        {photo.loadError && <ErrorBanner message={photo.loadError} />}
      </div>
    );
  }

  return (
    <div>
      <div
        ref={photo.photoRef}
        className={compact ? 'relative overflow-hidden select-none mb-3' : 'relative overflow-hidden select-none mb-5'}
        style={{
          borderRadius: RADIUS.large,
          boxShadow: SHADOW.soft,
          touchAction: (photo.faceBlurEnabled && !locked) ? 'none' : 'auto',
          background: compact ? C.surfaceSubtle : undefined,
        }}
        onMouseMove={(photo.faceBlurEnabled && !locked) ? photo.onHandleDragMove : undefined}
        onMouseUp={(photo.faceBlurEnabled && !locked) ? photo.onHandleDragEnd : undefined}
        onMouseLeave={(photo.faceBlurEnabled && !locked) ? photo.onHandleDragEnd : undefined}
        onTouchMove={(photo.faceBlurEnabled && !locked) ? photo.onHandleDragMove : undefined}
        onTouchEnd={(photo.faceBlurEnabled && !locked) ? photo.onHandleDragEnd : undefined}
      >
        <img
          src={(photo.safeImage || photo.rawImage).dataUrl}
          alt="Yüklenen kombin (yüz bulanıklaştırılmış önizleme)"
          className={compact ? 'w-full object-contain block' : 'w-full object-cover block stylist-photo-img'}
          style={{ opacity: photo.blurring ? 0.6 : 1, maxHeight: compact ? 360 : undefined }}
          draggable={false}
        />
        {photo.faceBlurEnabled && !locked && (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                left: `calc(${photo.blurCenterX} * 100%)`,
                top: `calc(${photo.blurCenterY} * 100%)`,
                width: `calc(${photo.blurRadius * 2} * 100%)`,
                aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: 'rgba(var(--accent-rgb), 0.10)',
                border: `2px dashed ${C.accent}`,
              }}
            />
            <div
              role="slider"
              tabIndex={0}
              aria-label="Bulanıklaştırma alanını taşı"
              aria-valuetext={`Yatay %${Math.round(photo.blurCenterX * 100)}, dikey %${Math.round(photo.blurCenterY * 100)}`}
              className="absolute flex items-center justify-center press-icon"
              style={{
                left: `calc(${photo.blurCenterX} * 100%)`,
                top: `calc(${photo.blurCenterY} * 100%)`,
                width: 40, height: 40, transform: 'translate(-50%, -50%)',
                cursor: photo.activeHandleRef.current === 'move' ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
              onMouseDown={photo.onHandleDragStart('move')}
              onTouchStart={photo.onHandleDragStart('move')}
              onKeyDown={photo.onHandleKeyDown('move')}
            >
              <div
                style={{
                  width: 15, height: 15, borderRadius: 999, background: C.accent,
                  border: '2px solid #FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              />
            </div>
            <div
              role="slider"
              tabIndex={0}
              aria-label="Bulanıklaştırma alanının boyutu"
              aria-valuetext={`Yarıçap %${Math.round(photo.blurRadius * 100)}`}
              className="absolute flex items-center justify-center cursor-ew-resize press-icon"
              style={{
                left: `calc(${photo.blurCenterX + photo.blurRadius} * 100%)`,
                top: `calc(${photo.blurCenterY} * 100%)`,
                width: 22, height: 22, transform: 'translate(-50%, -50%)',
                touchAction: 'none',
              }}
              onMouseDown={photo.onHandleDragStart('resize')}
              onTouchStart={photo.onHandleDragStart('resize')}
              onKeyDown={photo.onHandleKeyDown('resize')}
            >
              <div
                style={{
                  width: 13, height: 13, borderRadius: 999, background: '#FFFFFF',
                  border: `2px solid ${C.accent}`, boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              />
            </div>
          </>
        )}
        {!locked && (
          <button
            onClick={photo.reset}
            className="press-icon press-btn absolute flex items-center justify-center rounded-full"
            style={{ top: compact ? 12 : 16, right: compact ? 12 : 16, width: 32, height: 32, background: 'rgba(0,0,0,0.45)', color: '#FFFFFF', boxShadow: 'none' }}
            aria-label="Fotoğrafı kaldır"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {!locked && (
        <label className={compact ? 'flex items-center gap-2 mb-2 font-sans' : 'flex items-center gap-2.5 mb-6 font-sans'} style={{ fontSize: compact ? 12 : 13, color: C.textSecondary, fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={photo.faceBlurEnabled}
            onChange={(e) => photo.setFaceBlurEnabled(e.target.checked)}
            style={{ accentColor: C.accent, width: 16, height: 16 }}
          />
          Yüzümü bulanıklaştır {!compact && <span style={{ color: C.textMuted, fontWeight: 400 }}>(ortadan taşı, kenardan boyutlandır)</span>}
        </label>
      )}
      {photo.loadError && <ErrorBanner message={photo.loadError} />}
    </div>
  );
}
