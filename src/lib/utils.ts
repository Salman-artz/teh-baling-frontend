export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(date));
}

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD sesuai zona waktu WIB (Asia/Jakarta)
 */
export function getWibDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Mendapatkan jam saat ini dalam desimal (misal 14.5 = 14:30) sesuai zona waktu WIB
 */
export function getWibHourDec(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  let hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  return hour + minute / 60;
}

/**
 * Mendapatkan string jam format HH:mm:ss WIB
 */
export function getWibTimeString(date: Date = new Date()): string {
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date) + ' WIB'
  );
}

/**
 * Mendapatkan string tanggal lokal lengkap (contoh: Jumat, 18 Sep 2026)
 */
export function getWibDateFormatted(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

