import { useState, useRef, useCallback, useEffect } from 'react';
import { fileToImage, applyFaceBlur } from '../image.js';

const DEFAULT_BLUR_CENTER_X = 0.5;
const DEFAULT_BLUR_CENTER_Y = 0.16;
const DEFAULT_BLUR_RADIUS = 0.18;
const MIN_BLUR_RADIUS = 0.06;
const MAX_BLUR_RADIUS = 0.5;

export function usePhotoEditor() {
  const [rawImage, setRawImage] = useState(null);
  const [safeImage, setSafeImage] = useState(null);
  const [faceBlurEnabled, setFaceBlurEnabled] = useState(true);
  const [blurCenterX, setBlurCenterX] = useState(DEFAULT_BLUR_CENTER_X);
  const [blurCenterY, setBlurCenterY] = useState(DEFAULT_BLUR_CENTER_Y);
  const [blurRadius, setBlurRadius] = useState(DEFAULT_BLUR_RADIUS);
  const [blurring, setBlurring] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const photoRef = useRef(null);
  const activeHandleRef = useRef(null);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, centerX: 0, centerY: 0 });
  const blurCenterXRef = useRef(DEFAULT_BLUR_CENTER_X);
  const blurCenterYRef = useRef(DEFAULT_BLUR_CENTER_Y);
  const blurRadiusRef = useRef(DEFAULT_BLUR_RADIUS);
  const dragDepthRef = useRef(0);

  useEffect(() => { blurCenterXRef.current = blurCenterX; }, [blurCenterX]);
  useEffect(() => { blurCenterYRef.current = blurCenterY; }, [blurCenterY]);
  useEffect(() => { blurRadiusRef.current = blurRadius; }, [blurRadius]);

  const loadFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLoadError('Bu bir resim dosyası değil. Lütfen JPEG, PNG veya HEIC formatında bir fotoğraf seçin.');
      return;
    }
    try {
      const img = await fileToImage(file);
      setRawImage(img);
      setBlurCenterX(DEFAULT_BLUR_CENTER_X);
      setBlurCenterY(DEFAULT_BLUR_CENTER_Y);
      setBlurRadius(DEFAULT_BLUR_RADIUS);
      setFaceBlurEnabled(true);
      setLoadError('');
    } catch {
      setLoadError('Fotoğraf yüklenemedi. Farklı bir fotoğrafla tekrar dener misin?');
    }
  }, []);

  const onPick = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    loadFile(file);
  }, [loadFile]);

  const onZoneDragEnter = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  }, []);
  const onZoneDragOver = useCallback((e) => { e.preventDefault(); }, []);
  const onZoneDragLeave = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  }, []);
  const onZoneDrop = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(file);
  }, [loadFile]);

  useEffect(() => {
    if (!rawImage) {
      setSafeImage(null);
      return;
    }
    let cancelled = false;
    const isDragging = !!activeHandleRef.current;
    setBlurring(true);
    const delay = isDragging ? 120 : 0;
    const timer = setTimeout(() => {
      applyFaceBlur(
        rawImage.dataUrl, rawImage.mediaType,
        blurCenterX, blurCenterY, faceBlurEnabled ? blurRadius : 0
      )
        .then((res) => { if (!cancelled) setSafeImage(res); })
        .catch(() => { if (!cancelled) setLoadError('Fotoğraf işlenemedi. Tekrar dener misin?'); })
        .finally(() => { if (!cancelled) setBlurring(false); });
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [rawImage, faceBlurEnabled, blurCenterX, blurCenterY, blurRadius]);

  const updateHandleFromPointer = useCallback((clientX, clientY) => {
    const el = photoRef.current;
    const handle = activeHandleRef.current;
    if (!el || !handle) return;
    const rect = el.getBoundingClientRect();
    const start = dragStartRef.current;
    if (handle === 'move') {
      const dx = (clientX - start.pointerX) / rect.width;
      const dy = (clientY - start.pointerY) / rect.height;
      setBlurCenterX(Math.max(0, Math.min(1, start.centerX + dx)));
      setBlurCenterY(Math.max(0, Math.min(1, start.centerY + dy)));
    } else {
      const r = Math.abs((clientX - rect.left) / rect.width - blurCenterXRef.current);
      setBlurRadius(Math.max(MIN_BLUR_RADIUS, Math.min(MAX_BLUR_RADIUS, r)));
    }
  }, []);

  const onHandleDragStart = useCallback((handle) => (e) => {
    e.stopPropagation();
    activeHandleRef.current = handle;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      pointerX: clientX, pointerY: clientY,
      centerX: blurCenterXRef.current, centerY: blurCenterYRef.current,
    };
    updateHandleFromPointer(clientX, clientY);
  }, [updateHandleFromPointer]);

  const onHandleDragMove = useCallback((e) => {
    if (!activeHandleRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    updateHandleFromPointer(clientX, clientY);
  }, [updateHandleFromPointer]);

  const onHandleDragEnd = useCallback(() => { activeHandleRef.current = null; }, []);

  const onHandleKeyDown = useCallback((handle) => (e) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    if (handle === 'move') {
      if (e.key === 'ArrowLeft') setBlurCenterX((x) => Math.max(0, x - step));
      else if (e.key === 'ArrowRight') setBlurCenterX((x) => Math.min(1, x + step));
      else if (e.key === 'ArrowUp') setBlurCenterY((y) => Math.max(0, y - step));
      else if (e.key === 'ArrowDown') setBlurCenterY((y) => Math.min(1, y + step));
      else return;
    } else {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        setBlurRadius((r) => Math.max(MIN_BLUR_RADIUS, r - step));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        setBlurRadius((r) => Math.min(MAX_BLUR_RADIUS, r + step));
      } else return;
    }
    e.preventDefault();
  }, []);

  const reset = useCallback(() => {
    setRawImage(null);
    setSafeImage(null);
    setLoadError('');
  }, []);

  return {
    rawImage, safeImage, faceBlurEnabled, setFaceBlurEnabled,
    blurCenterX, blurCenterY, blurRadius, blurring, loadError,
    isDragOver, photoRef, activeHandleRef,
    loadFile, onPick, onZoneDragEnter, onZoneDragOver, onZoneDragLeave, onZoneDrop,
    onHandleDragStart, onHandleDragMove, onHandleDragEnd, onHandleKeyDown,
    reset,
  };
}
