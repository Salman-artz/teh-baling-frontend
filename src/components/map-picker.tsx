/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Layers,
  Check,
  Crosshair,
  ExternalLink,
  ClipboardPaste,
  Sparkles,
  Loader2,
  ZoomIn,
  Globe,
} from 'lucide-react';
import { api } from '@/lib/api-client';

interface MapPickerProps {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
  boothName?: string;
}

type TileProvider = 'google-street' | 'google-hybrid' | 'osm' | 'esri';

// Helper to convert DMS (Degrees Minutes Seconds) to Decimal
function parseDMSToDecimal(dmsStr: string): number | null {
  const match = dmsStr.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([NSEWnsew])/);
  if (!match) return null;
  const degrees = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  const seconds = parseFloat(match[3]);
  const direction = match[4].toUpperCase();

  let dec = degrees + minutes / 60 + seconds / 3600;
  if (direction === 'S' || direction === 'W') {
    dec = -dec;
  }
  return dec;
}

export default function MapPicker({ latitude, longitude, onChange, boothName }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [activeTile, setActiveTile] = useState<TileProvider>('google-street');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [gmapsInput, setGmapsInput] = useState('');
  const [resolvingGmaps, setResolvingGmaps] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const initialLat = parseFloat(latitude) || -7.2575;
  const initialLng = parseFloat(longitude) || 112.7521;

  const applyCoordinates = useCallback(
    (lat: number, lng: number) => {
      const latStr = lat.toFixed(7);
      const lngStr = lng.toFixed(7);
      onChangeRef.current(latStr, lngStr);

      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([lat, lng], 16);
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current
          .setPopupContent(`<b>${boothName || 'Lokasi Booth'}</b><br>Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
          .openPopup();
      }

      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 4000);
    },
    [boothName]
  );

  // Switch Tile Layer Helper
  const switchTileLayer = useCallback((type: TileProvider, LInstance?: any) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const L = LInstance || (window as any).L;
    if (!L) return;

    let newLayer: any;
    if (type === 'google-street') {
      newLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps',
      });
    } else if (type === 'google-hybrid') {
      newLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps Satelit',
      });
    } else if (type === 'esri') {
      newLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: '© Esri',
        }
      );
    } else {
      // OpenStreetMap
      newLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '© OpenStreetMap contributors',
      });
    }

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
    setActiveTile(type);
  }, []);

  // Initialize interactive Leaflet map
  useEffect(() => {
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;
      (window as any).L = L;

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }

      // Elegant Custom Red/Emerald Map Pin with Tea Cup
      const customPinIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="position: relative; transform: translate(-50%, -100%); cursor: grab; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.45));">
            <div style="
              width: 44px;
              height: 44px;
              border-radius: 50% 50% 50% 0;
              background: linear-gradient(135deg, #059669 0%, #064e3b 100%);
              border: 3px solid #ffffff;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              <span style="transform: rotate(45deg); font-size: 20px; line-height: 1;">🍵</span>
            </div>
            <div style="
              width: 14px;
              height: 6px;
              background: rgba(0,0,0,0.4);
              border-radius: 50%;
              margin: -3px auto 0;
              filter: blur(1.5px);
            "></div>
          </div>
        `,
        iconSize: [44, 52],
        iconAnchor: [22, 50],
      });

      const currentLat = parseFloat(latitude) || initialLat;
      const currentLng = parseFloat(longitude) || initialLng;

      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      // Primary Google Maps Roadmap layer
      const googleTile = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps',
      }).addTo(map);
      tileLayerRef.current = googleTile;

      const marker = L.marker([currentLat, currentLng], {
        icon: customPinIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);
      markerRef.current = marker;

      marker
        .bindPopup(`<b>${boothName || 'Lokasi Booth'}</b><br>Koordinat: ${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`)
        .openPopup();

      const updatePosition = (lat: number, lng: number) => {
        const latStr = lat.toFixed(7);
        const lngStr = lng.toFixed(7);
        onChangeRef.current(latStr, lngStr);
        marker
          .setPopupContent(`<b>${boothName || 'Lokasi Booth'}</b><br>Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
          .openPopup();
      };

      marker.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        updatePosition(lat, lng);
      });

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        updatePosition(lat, lng);
      });

      setMapReady(true);

      // Trigger recalculation when container is shown/resized
      const invalidate = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };

      [50, 150, 300, 600, 1000, 1500].forEach((delay) => {
        setTimeout(invalidate, delay);
      });

      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        const ro = new ResizeObserver(() => invalidate());
        ro.observe(mapContainerRef.current);
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker position when external latitude/longitude change
  useEffect(() => {
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (!isNaN(latNum) && !isNaN(lngNum) && markerRef.current && mapInstanceRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - latNum) > 0.000001 ||
        Math.abs(currentPos.lng - lngNum) > 0.000001
      ) {
        markerRef.current.setLatLng([latNum, lngNum]);
        mapInstanceRef.current.setView([latNum, lngNum], 16);
        markerRef.current.setPopupContent(
          `<b>${boothName || 'Lokasi Booth'}</b><br>Koordinat: ${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`
        );
      }
    }
  }, [latitude, longitude, boothName]);

  // Client parser for various coordinate formats
  const parseLocalCoordinates = (inputStr: string): { lat: number; lng: number } | null => {
    const trimmed = inputStr.trim();
    if (!trimmed) return null;

    // Pattern 1: DMS Format like 7°15'27.0"S 112°45'07.6"E
    const dmsParts = trimmed.split(/[,;\s]+(?=\d+°)/);
    if (dmsParts.length >= 2) {
      const latDec = parseDMSToDecimal(dmsParts[0]);
      const lngDec = parseDMSToDecimal(dmsParts[1]);
      if (latDec !== null && lngDec !== null) {
        return { lat: latDec, lng: lngDec };
      }
    }

    // Pattern 2: Raw Decimal Coordinates like "-7.2575, 112.7521" or "-7.2575 112.7521"
    const rawMatch = trimmed.match(/([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/);
    if (rawMatch) {
      const lat = parseFloat(rawMatch[1]);
      const lng = parseFloat(rawMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    // Pattern 3: Google Maps URL containing @lat,lng
    const atMatch = trimmed.match(/@([-+]?\d{1,2}\.\d+),([-+]?\d{1,3}\.\d+)/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Pattern 4: Google Maps URL query ?q=lat,lng
    const qMatch = trimmed.match(/[?&](?:q|query|ll|center)=([-+]?\d{1,2}\.\d+),([-+]?\d{1,3}\.\d+)/);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }

    // Pattern 5: Place coordinates !3dlat!4dlng
    const dataMatch = trimmed.match(/!3d([-+]?\d{1,2}\.\d+)!4d([-+]?\d{1,3}\.\d+)/);
    if (dataMatch) {
      return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
    }

    return null;
  };

  // Process Google Maps input (local regex + server-side shortlink resolution)
  const handleProcessGmaps = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = gmapsInput.trim();
    if (!trimmed) {
      alert('Silakan tempel link Google Maps atau angka koordinat terlebih dahulu.');
      return;
    }

    // 1. Try local parse
    const localResult = parseLocalCoordinates(trimmed);
    if (localResult) {
      applyCoordinates(localResult.lat, localResult.lng);
      setGmapsInput('');
      return;
    }

    // 2. If it's a URL (shortlink like maps.app.goo.gl or standard URL), resolve via backend
    if (trimmed.includes('http') || trimmed.includes('goo.gl') || trimmed.includes('maps.')) {
      setResolvingGmaps(true);
      try {
        const res = await api.get<{ latitude: string; longitude: string }>(
          `/booths/resolve-gmaps?url=${encodeURIComponent(trimmed)}`
        );
        if (res.success && res.data) {
          const lat = parseFloat(res.data.latitude);
          const lng = parseFloat(res.data.longitude);
          applyCoordinates(lat, lng);
          setGmapsInput('');
          return;
        } else {
          alert(
            res.error?.message ||
              'Tidak dapat mendeteksi koordinat dari link tersebut. Coba salin langsung angka koordinatnya dari Google Maps.'
          );
        }
      } catch {
        alert('Gagal memproses link Google Maps. Silakan salin angka koordinat secara manual.');
      } finally {
        setResolvingGmaps(false);
      }
    } else {
      alert(
        'Format tidak dikenali. Contoh yang didukung:\n- Angka: -7.2575, 112.7521\n- Link Google Maps: https://maps.app.goo.gl/... atau https://maps.google.com/?q=...\n- Format Derajat: 7°15\'27.0"S 112°45\'07.6"E'
      );
    }
  };

  // Device GPS
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung Geolocation GPS.');
      return;
    }
    setGpsLoading(true);
    setGpsSuccess(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        applyCoordinates(lat, lng);
        setGpsLoading(false);
        setGpsSuccess(true);
        setTimeout(() => setGpsSuccess(false), 3000);
      },
      (err) => {
        console.error('GPS error:', err);
        alert('Gagal mendeteksi lokasi otomatis. Pastikan izin akses lokasi (GPS) telah diizinkan.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Set pin to center of current map view
  const handleSetPinToCenter = () => {
    if (mapInstanceRef.current && markerRef.current) {
      const center = mapInstanceRef.current.getCenter();
      applyCoordinates(center.lat, center.lng);
    }
  };

  // Open Google Maps in New Tab
  const handleOpenGoogleMaps = () => {
    const lat = parseFloat(latitude) || -7.2575;
    const lng = parseFloat(longitude) || 112.7521;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const currentLat = parseFloat(latitude) || -7.2575;
  const currentLng = parseFloat(longitude) || 112.7521;

  return (
    <div className="space-y-3">
      {/* Top Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <MapPin className="w-4 h-4 text-emerald-700" />
          Pilih Titik Lokasi Peta
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={gpsLoading}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition shadow-xs ${
              gpsSuccess
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800'
            }`}
          >
            {gpsSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
            )}
            {gpsLoading ? 'Mendeteksi...' : gpsSuccess ? 'GPS Berhasil!' : '📍 GPS Lokasi Saya'}
          </button>
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            title="Buka Google Maps di Tab Baru untuk cari titik / alamat"
            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            Buka GMaps ↗
          </button>
        </div>
      </div>

      {/* AMBIL DARI GOOGLE MAPS (Input Box) */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span>Ambil Titik dari Google Maps (Link / Koordinat)</span>
          </label>
          {pasteSuccess && (
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-md animate-pulse">
              <Check className="w-3 h-3" /> Titik Peta Berhasil Diterapkan!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={gmapsInput}
              onChange={(e) => setGmapsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleProcessGmaps(e);
                }
              }}
              placeholder="Tempel link share Google Maps atau koordinat (misal: -7.2575, 112.7521)..."
              className="w-full rounded-lg border border-emerald-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none shadow-2xs"
            />
            <ClipboardPaste className="absolute left-3 top-2.5 h-4 w-4 text-emerald-700" />
          </div>
          <button
            type="button"
            onClick={handleProcessGmaps}
            disabled={resolvingGmaps}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition shadow-xs shrink-0 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            {resolvingGmaps ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Terapkan Titik</span>
            )}
          </button>
        </div>
        <p className="text-[11px] text-emerald-800/80">
          💡 <em>Tips:</em> Buka Google Maps ➜ Klik kanan titik booth di Google Maps ➜ Klik angka koordinat untuk Salin ➜ Tempel di sini lalu klik <strong>Terapkan Titik</strong>.
        </p>
      </div>

      {/* Layer Switcher */}
      <div className="flex items-center justify-end text-[11px]">
        {/* Tile Provider Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 px-1 flex items-center gap-0.5">
            <Globe className="w-3 h-3 text-emerald-700" /> Tampilan Peta:
          </span>
          <button
            type="button"
            onClick={() => switchTileLayer('google-street')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
              activeTile === 'google-street'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Google Maps
          </button>
          <button
            type="button"
            onClick={() => switchTileLayer('google-hybrid')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
              activeTile === 'google-hybrid'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Satelit
          </button>
          <button
            type="button"
            onClick={() => switchTileLayer('osm')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
              activeTile === 'osm'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            OSM
          </button>
        </div>
      </div>

      {/* MAP CONTAINER VIEWPORT */}
      <div
        className="relative rounded-2xl border-2 border-emerald-800 overflow-hidden shadow-md bg-slate-200 w-full"
        style={{ height: '340px' }}
      >
        {!mapReady && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-100 text-slate-500 gap-2">
            <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold">Memuat Peta Interaktif...</span>
          </div>
        )}
        <div
          ref={mapContainerRef}
          data-testid="map-picker-container"
          style={{ height: '340px', width: '100%', minHeight: '340px', position: 'relative' }}
          className="w-full z-10"
        />

        {/* Action Button: Set Pin to Center */}
        <button
          type="button"
          onClick={handleSetPinToCenter}
          title="Pindahkan Pin ke Tengah Layar"
          className="absolute top-3 right-3 z-20 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md border border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
        >
          <Crosshair className="w-4 h-4 text-emerald-700" />
          Set Pin ke Tengah Peta
        </button>

        {/* Floating Coordinates Bar */}
        <div className="absolute bottom-3 left-3 z-20 rounded-lg bg-slate-950/90 backdrop-blur-xs px-3 py-1.5 text-xs font-mono font-bold text-white shadow-lg flex items-center gap-2 border border-slate-700">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>
            Lat: {currentLat.toFixed(6)} | Lng: {currentLng.toFixed(6)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>💡 Geser peta dan klik tombol <strong>Set Pin ke Tengah Peta</strong>, atau geser pin 🍵 secara langsung.</span>
        <span className="font-semibold text-emerald-700 flex items-center gap-1">
          <ZoomIn className="w-3 h-3" /> Scroll Zoom
        </span>
      </div>
    </div>
  );
}
