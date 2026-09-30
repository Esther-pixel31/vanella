// 5500 -> "KES 5,500". Accepts numbers or the backend's "5500.00" strings.
export function formatKes(amount) {
  const value = Number(amount);
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2);

  const [whole, cents] = text.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `KES ${cents ? `${grouped}.${cents}` : grouped}`;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// "Today, 2:30 PM" or "27 Sep, 8:53 PM"
export function formatOrderDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();

  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes} ${date.getHours() < 12 ? 'AM' : 'PM'}`;

  const isToday = date.toDateString() === now.toDateString();
  const day = isToday ? 'Today' : `${date.getDate()} ${MONTHS[date.getMonth()]}`;

  return `${day}, ${time}`;
}

// Order ids are long UUIDs; show a short reference instead.
export function formatOrderRef(orderId) {
  return orderId.slice(0, 8).toUpperCase();
}
